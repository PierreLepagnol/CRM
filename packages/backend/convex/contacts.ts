import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { guardContactRead, requireContactWrite } from "./access";
import { requireUserId } from "./lib/auth";
import { toClearableDbPatch } from "./lib/contactPatch";
import { movesFromPlan } from "./lib/position";
import { assertMontant, contactStage, LIST_CAP } from "./lib/validators";

/**
 * Vérifie que chaque `user_id` fourni (propriétaire, responsables) correspond à
 * une ligne `app_users` existante — refus sinon (pas d'attribution à un id
 * arbitraire). `null`/`undefined` sont ignorés (effacement / champ omis).
 */
async function assertUsersExist(
  ctx: MutationCtx,
  ids: (string | null | undefined)[],
): Promise<void> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  for (const id of unique) {
    const row = await ctx.db
      .query("app_users")
      .withIndex("by_user_id", (q) => q.eq("user_id", id))
      .first();
    if (!row) throw new ConvexError(`Utilisateur inconnu : ${id}`);
  }
}

/**
 * Nom d'affichage d'une Entreprise liée, pour dénormalisation sur le contact
 * (`entreprise_nom`, indexé pour la recherche). `undefined` si pas d'entreprise
 * ou entreprise supprimée. Réutilisé par `contactImport`.
 */
export async function resolveEntrepriseNom(
  ctx: MutationCtx,
  entrepriseId: Id<"entreprises"> | undefined,
): Promise<string | undefined> {
  if (!entrepriseId) return undefined;
  const e = await ctx.db.get(entrepriseId);
  return e && e.deleted_at === undefined ? e.nom : undefined;
}

/** Position suivante en fin de colonne. Réutilisé par `contactImport`. */
export async function getMaxPosition(
  ctx: MutationCtx,
  stage: Doc<"contacts">["stage"],
): Promise<number> {
  const rows = await ctx.db
    .query("contacts")
    .withIndex("by_active_stage_position", (q) =>
      q.eq("deleted_at", undefined).eq("stage", stage),
    )
    .order("desc")
    .first();
  return rows ? rows.position + 1 : 0;
}

/**
 * Attache à chaque contact le nom de son Entreprise liée (`entreprise_nom`),
 * résolu depuis `entreprise_id`. C'est la source de vérité d'affichage ; le
 * champ texte legacy `entreprise` ne sert plus que de repli (contacts non
 * encore migrés). Cf. docs/adr/0001-entreprise-entite-premier-ordre.md.
 */
async function withEntrepriseNom<T extends { entreprise_id?: Id<"entreprises"> }>(
  ctx: QueryCtx,
  rows: T[],
): Promise<(T & { entreprise_nom?: string })[]> {
  const ids = [...new Set(rows.map((r) => r.entreprise_id).filter(Boolean))] as Id<"entreprises">[];
  const entreprises = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const nameById = new Map(
    entreprises
      .filter((e): e is NonNullable<typeof e> => e !== null && e.deleted_at === undefined)
      .map((e) => [e._id as string, e.nom]),
  );
  return rows.map((r) => ({
    ...r,
    entreprise_nom: r.entreprise_id ? nameById.get(r.entreprise_id as string) : undefined,
  }));
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await guardContactRead(ctx))) return [];
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_active_updated", (q) => q.eq("deleted_at", undefined))
      .order("desc")
      .take(LIST_CAP);
    return withEntrepriseNom(ctx, rows);
  },
});

export const listByStage = query({
  args: { stage: contactStage },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_active_stage_position", (q) =>
        q.eq("deleted_at", undefined).eq("stage", args.stage),
      )
      .order("asc")
      .take(LIST_CAP);
    return withEntrepriseNom(ctx, rows);
  },
});


export const get = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return null;
    const row = await ctx.db.get(args.id);
    if (!row || row.deleted_at !== undefined) return null;
    const [enriched] = await withEntrepriseNom(ctx, [row]);
    return enriched;
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    if (!args.q.trim()) return [];
    const byNom = await ctx.db
      .query("contacts")
      .withSearchIndex("search_nom", (q) => q.search("nom", args.q))
      .take(10);
    const byPrenom = await ctx.db
      .query("contacts")
      .withSearchIndex("search_prenom", (q) => q.search("prenom", args.q))
      .take(10);
    const byEntreprise = await ctx.db
      .query("contacts")
      .withSearchIndex("search_entreprise", (q) => q.search("entreprise_nom", args.q))
      .take(10);
    const combined = [...byNom, ...byPrenom, ...byEntreprise].filter(
      (c) => c.deleted_at === undefined,
    );
    const deduped = combined
      .filter((c, i, arr) => arr.findIndex((x) => x._id === c._id) === i)
      .slice(0, 15);
    return withEntrepriseNom(ctx, deduped);
  },
});

export const listDueRelances = query({
  args: {},
  handler: async (ctx) => {
    if (!(await guardContactRead(ctx))) return [];
    const limit = Date.now() + 24 * 60 * 60 * 1000;
    // Borne d'index (gte(0) exclut les contacts sans relance, triés avant 0)
    // plutôt qu'un .filter() qui scannerait toute la table.
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_active_next_relance", (q) =>
        q.eq("deleted_at", undefined).gte("next_relance_at", 0).lte("next_relance_at", limit),
      )
      .order("asc")
      .take(50);
    return rows;
  },
});

const sharedOptionalFields = {
  entreprise: v.optional(v.string()),
  entreprise_id: v.optional(v.id("entreprises")),
  email: v.optional(v.string()),
  telephone: v.optional(v.string()),
  linkedin_url: v.optional(v.string()),
  poste: v.optional(v.string()),
  contact_sciam: v.optional(v.string()),
  owner_id: v.optional(v.string()),
  responsible_ids: v.optional(v.array(v.string())),
  montant: v.optional(v.number()),
  notes_md: v.optional(v.string()),
  next_relance_at: v.optional(v.number()),
  stage: v.optional(contactStage),
} as const;

const contactFields = {
  prenom: v.string(),
  nom: v.string(),
  ...sharedOptionalFields,
} as const;

// Patch : champs éditables après création. Les champs legacy (`entreprise`
// texte libre, `contact_sciam`) sont volontairement EXCLUS — le rattachement
// passe par attachContact/detachContact et le propriétaire par owner_id, pour
// ne pas laisser réapparaître les données legacy que les backfills éliminent
// (cf. CONTEXT.md « Contact SCIAM (hérité) », ADR 0001). L'entreprise se change
// via entreprise_id (attach), jamais par le texte libre ici.
const contactPatchFields = {
  prenom: v.optional(v.string()),
  nom: v.optional(v.string()),
  email: v.optional(v.string()),
  telephone: v.optional(v.string()),
  linkedin_url: v.optional(v.string()),
  poste: v.optional(v.string()),
  // null means "clear the field" (undefined is dropped by JSON serialization)
  owner_id: v.optional(v.union(v.string(), v.null())),
  responsible_ids: v.optional(v.array(v.string())),
  montant: v.optional(v.number()),
  notes_md: v.optional(v.string()),
  next_relance_at: v.optional(v.union(v.number(), v.null())),
  stage: v.optional(contactStage),
} as const;

export const create = mutation({
  args: contactFields,
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const userId = await requireUserId(ctx);
    assertMontant(args.montant);
    await assertUsersExist(ctx, [args.owner_id, ...(args.responsible_ids ?? [])]);
    const stage = args.stage ?? "nouveau";
    const position = await getMaxPosition(ctx, stage);
    const { stage: _stage, ...rest } = args;
    const id = await ctx.db.insert("contacts", {
      ...rest,
      entreprise_nom: await resolveEntrepriseNom(ctx, rest.entreprise_id),
      owner_id: rest.owner_id ?? userId,
      stage,
      position,
      created_by: userId,
      updated_at: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("contacts"), patch: v.object(contactPatchFields) },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    assertMontant(args.patch.montant);
    await assertUsersExist(ctx, [args.patch.owner_id, ...(args.patch.responsible_ids ?? [])]);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined) throw new ConvexError("Contact introuvable");
    const nextPosition =
      args.patch.stage !== undefined && args.patch.stage !== existing.stage
        ? await getMaxPosition(ctx, args.patch.stage)
        : existing.position;
    // null → undefined supprime le champ (owner_id, next_relance_at).
    const dbPatch = toClearableDbPatch(args.patch);
    await ctx.db.patch(args.id, {
      ...dbPatch,
      position: nextPosition,
      updated_at: Date.now(),
    });
    return null;
  },
});

export const moveToStage = mutation({
  args: {
    id: v.id("contacts"),
    newStage: contactStage,
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const contact = await ctx.db.get(args.id);
    if (!contact || contact.deleted_at !== undefined) throw new ConvexError("Contact introuvable");

    const colItems = await ctx.db
      .query("contacts")
      .withIndex("by_active_stage_position", (q) =>
        q.eq("deleted_at", undefined).eq("stage", args.newStage),
      )
      .order("asc")
      .take(LIST_CAP);

    // Indexation fractionnaire : un déplacement = une écriture (cf. lib/position).
    const others = colItems
      .filter((c) => c._id !== args.id)
      .map((c) => ({ id: c._id as string, position: c.position }));
    const writes = movesFromPlan(
      others,
      args.targetIndex,
      args.id,
      "stage",
      args.newStage,
      Date.now(),
    );
    await Promise.all(writes.map((w) => ctx.db.patch(w.id as Id<"contacts">, w.patch)));
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Contact introuvable");
    await ctx.db.patch(args.id, { deleted_at: Date.now(), updated_at: Date.now() });
    return null;
  },
});
