import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { guardContactRead, requireContactWrite } from "./access";
import { requireUserId } from "./lib/auth";
import { toClearableDbPatch } from "./lib/contactPatch";
import { assertMontant, contactStage } from "./lib/validators";

async function getMaxPosition(ctx: MutationCtx, stage: string): Promise<number> {
  const rows = await ctx.db
    .query("contacts")
    .withIndex("by_stage_and_position", (q) => q.eq("stage", stage as any))
    .order("desc")
    .filter((q) => q.eq(q.field("deleted_at"), undefined))
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
      .withIndex("by_updated_at")
      .order("desc")
      .collect();
    return withEntrepriseNom(ctx, rows.filter((c) => c.deleted_at === undefined));
  },
});

export const listByStage = query({
  args: { stage: contactStage },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_stage_and_position", (q) => q.eq("stage", args.stage))
      .order("asc")
      .collect();
    return withEntrepriseNom(ctx, rows.filter((c) => c.deleted_at === undefined));
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
      .withSearchIndex("search_entreprise", (q) => q.search("entreprise", args.q))
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
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_next_relance_at")
      .order("asc")
      .filter((q) =>
        q.and(
          q.neq(q.field("next_relance_at"), undefined),
          q.lte(q.field("next_relance_at"), limit),
          q.eq(q.field("deleted_at"), undefined),
        ),
      )
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

const contactPatchFields = {
  prenom: v.optional(v.string()),
  nom: v.optional(v.string()),
  entreprise: v.optional(v.string()),
  email: v.optional(v.string()),
  telephone: v.optional(v.string()),
  linkedin_url: v.optional(v.string()),
  poste: v.optional(v.string()),
  contact_sciam: v.optional(v.string()),
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
    const stage = args.stage ?? "nouveau";
    const position = await getMaxPosition(ctx, stage);
    const { stage: _stage, ...rest } = args;
    const id = await ctx.db.insert("contacts", {
      ...rest,
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
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined) throw new Error("Contact introuvable");
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
    if (!contact || contact.deleted_at !== undefined) throw new Error("Contact introuvable");

    const colItems = await ctx.db
      .query("contacts")
      .withIndex("by_stage_and_position", (q) => q.eq("stage", args.newStage))
      .order("asc")
      .filter((q) => q.eq(q.field("deleted_at"), undefined))
      .collect();

    const filtered = colItems.filter((c) => c._id !== args.id);
    const idx = Math.max(0, Math.min(args.targetIndex, filtered.length));
    filtered.splice(idx, 0, { ...contact, stage: args.newStage });

    await Promise.all(
      filtered.map((c, i) =>
        ctx.db.patch(c._id, { stage: args.newStage, position: i, updated_at: Date.now() }),
      ),
    );
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contact introuvable");
    await ctx.db.patch(args.id, { deleted_at: Date.now(), updated_at: Date.now() });
    return null;
  },
});
