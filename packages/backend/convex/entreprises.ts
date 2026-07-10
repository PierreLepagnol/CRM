import { v } from "convex/values";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  guardContactRead,
  requireContactWrite,
  requirePageAccess,
} from "./access";
import { requireUserId } from "./lib/auth";
import {
  assertEntrepriseDeletable,
  normalizeEntrepriseName,
  resolveMergedNotes,
} from "./lib/entrepriseLogic";
import { LIST_CAP, secteurEntreprise } from "./lib/validators";

/** Contacts non supprimés rattachés à une entreprise. */
async function attachedContacts(
  ctx: QueryCtx | MutationCtx,
  entrepriseId: Id<"entreprises">,
): Promise<Doc<"contacts">[]> {
  const rows = await ctx.db
    .query("contacts")
    .withIndex("by_active_entreprise", (q) =>
      q.eq("deleted_at", undefined).eq("entreprise_id", entrepriseId),
    )
    .take(LIST_CAP);
  return rows;
}

/** Trouve une entreprise non supprimée par nom normalisé (garde-fou anti-doublon). */
async function findByNormalizedName(
  ctx: QueryCtx | MutationCtx,
  norm: string,
): Promise<Doc<"entreprises"> | null> {
  const row = await ctx.db
    .query("entreprises")
    .withIndex("by_active_nom_normalise", (q) =>
      q.eq("deleted_at", undefined).eq("nom_normalise", norm),
    )
    .first();
  return row ?? null;
}

/** Liste des entreprises avec stats calculées (nb de contacts, montant total). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requirePageAccess(ctx, "entreprises");
    const entreprises = await ctx.db
      .query("entreprises")
      .withIndex("by_active_updated", (q) => q.eq("deleted_at", undefined))
      .order("desc")
      .take(LIST_CAP);

    // ponytail: scan borné pour agréger les stats par entreprise. Dénormaliser
    // contactCount/montantTotal sur `entreprises` si le volume l'exige.
    const contacts = (await ctx.db.query("contacts").take(LIST_CAP)).filter(
      (c) => c.deleted_at === undefined && c.entreprise_id,
    );
    const counts = new Map<string, { nb: number; montant: number }>();
    for (const c of contacts) {
      const key = c.entreprise_id as string;
      const agg = counts.get(key) ?? { nb: 0, montant: 0 };
      agg.nb += 1;
      agg.montant += c.montant ?? 0;
      counts.set(key, agg);
    }

    return entreprises.map((e) => ({
      ...e,
      contactCount: counts.get(e._id)?.nb ?? 0,
      montantTotal: counts.get(e._id)?.montant ?? 0,
    }));
  },
});

/** Autocomplétion « commence par » : utilisée depuis le formulaire contact. */
export const searchByPrefix = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    const norm = normalizeEntrepriseName(args.q);
    if (!norm) return [];
    // Range scan sur l'index du nom normalisé (équivalent à matchesPrefix,
    // cf. lib/entrepriseLogic) au lieu d'un scan complet de la table.
    const rows = await ctx.db
      .query("entreprises")
      .withIndex("by_active_nom_normalise", (q) =>
        q
          .eq("deleted_at", undefined)
          .gte("nom_normalise", norm)
          .lt("nom_normalise", norm + "￿"),
      )
      .take(20);
    return rows
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
      .slice(0, 10)
      .map((e) => ({ _id: e._id, nom: e.nom }));
  },
});

/** Résolution de noms en masse (kanban/liste/export) pour les contact-readers. */
export const byIds = query({
  args: { ids: v.array(v.id("entreprises")) },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    if (args.ids.length > LIST_CAP)
      throw new ConvexError(`Trop d'identifiants (max ${LIST_CAP}).`);
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return rows
      .filter((e): e is Doc<"entreprises"> => e !== null && e.deleted_at === undefined)
      .map((e) => ({ _id: e._id, nom: e.nom }));
  },
});

/** Fiche entreprise : champs + stats + contacts rattachés. */
export const get = query({
  args: { id: v.id("entreprises") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "entreprises");
    const entreprise = await ctx.db.get(args.id);
    if (!entreprise || entreprise.deleted_at !== undefined) return null;
    const contacts = await attachedContacts(ctx, args.id);
    return {
      ...entreprise,
      contacts: contacts.map((c) => ({
        _id: c._id,
        prenom: c.prenom,
        nom: c.nom,
        poste: c.poste,
        email: c.email,
        montant: c.montant,
        stage: c.stage,
      })),
      contactCount: contacts.length,
      montantTotal: contacts.reduce((sum, c) => sum + (c.montant ?? 0), 0),
    };
  },
});

const entrepriseFields = {
  secteur: v.optional(secteurEntreprise),
  site_web: v.optional(v.string()),
  notes_md: v.optional(v.string()),
} as const;

/**
 * Crée une entreprise — idempotent sur le nom normalisé : si une entreprise de
 * même nom existe déjà, on renvoie la sienne plutôt que d'en créer un doublon
 * (garde-fou, cf. ADR 0001). Gardé par l'accès écriture des contacts pour
 * permettre la création à la volée depuis le formulaire contact.
 */
export const create = mutation({
  args: { nom: v.string(), ...entrepriseFields },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const userId = await requireUserId(ctx);
    const nom = args.nom.trim();
    if (!nom) throw new ConvexError("Le nom de l'entreprise est requis.");
    const norm = normalizeEntrepriseName(nom);
    const existing = await findByNormalizedName(ctx, norm);
    if (existing) return existing._id;
    return await ctx.db.insert("entreprises", {
      nom,
      nom_normalise: norm,
      secteur: args.secteur,
      site_web: args.site_web?.trim() || undefined,
      notes_md: args.notes_md?.trim() || undefined,
      created_by: userId,
      updated_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("entreprises"),
    patch: v.object({
      nom: v.optional(v.string()),
      // null efface explicitement le secteur (le retour à « non renseigné » ;
      // undefined seul serait indistinct d'un champ omis).
      secteur: v.optional(v.union(secteurEntreprise, v.null())),
      site_web: v.optional(v.string()),
      notes_md: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "entreprises");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined)
      throw new ConvexError("Entreprise introuvable");

    const dbPatch: Partial<Doc<"entreprises">> = { updated_at: Date.now() };
    let renamedTo: string | undefined;
    if (args.patch.nom !== undefined) {
      const nom = args.patch.nom.trim();
      if (!nom) throw new ConvexError("Le nom de l'entreprise est requis.");
      dbPatch.nom = nom;
      dbPatch.nom_normalise = normalizeEntrepriseName(nom);
      if (nom !== existing.nom) renamedTo = nom;
    }
    if (args.patch.secteur !== undefined)
      dbPatch.secteur = args.patch.secteur ?? undefined;
    if (args.patch.site_web !== undefined)
      dbPatch.site_web = args.patch.site_web.trim() || undefined;
    if (args.patch.notes_md !== undefined)
      dbPatch.notes_md = args.patch.notes_md.trim() || undefined;

    await ctx.db.patch(args.id, dbPatch);
    // Propage le renommage au nom dénormalisé des contacts rattachés (indexé
    // pour la recherche). Borné par le nombre de contacts de l'entreprise.
    if (renamedTo !== undefined) {
      const now = Date.now();
      for (const c of await attachedContacts(ctx, args.id)) {
        await ctx.db.patch(c._id, { entreprise_nom: renamedTo, updated_at: now });
      }
    }
    return null;
  },
});

/** Rattache un contact à une entreprise (depuis la fiche ou le formulaire contact). */
export const attachContact = mutation({
  args: { contact_id: v.id("contacts"), entreprise_id: v.id("entreprises") },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const contact = await ctx.db.get(args.contact_id);
    if (!contact || contact.deleted_at !== undefined)
      throw new ConvexError("Contact introuvable");
    const entreprise = await ctx.db.get(args.entreprise_id);
    if (!entreprise || entreprise.deleted_at !== undefined)
      throw new ConvexError("Entreprise introuvable");
    await ctx.db.patch(args.contact_id, {
      entreprise_id: args.entreprise_id,
      entreprise_nom: entreprise.nom,
      updated_at: Date.now(),
    });
    return null;
  },
});

/** Détache un contact de son entreprise. */
export const detachContact = mutation({
  args: { contact_id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const contact = await ctx.db.get(args.contact_id);
    if (!contact || contact.deleted_at !== undefined)
      throw new ConvexError("Contact introuvable");
    await ctx.db.patch(args.contact_id, {
      entreprise_id: undefined,
      entreprise_nom: undefined,
      updated_at: Date.now(),
    });
    return null;
  },
});

/**
 * Fusionne `absorbedId` dans `survivorId` : tous les contacts de l'absorbée sont
 * rattachés au survivant, les notes sont concaténées, puis l'absorbée est
 * supprimée (soft-delete). Cf. CONTEXT.md (Fusion) et ADR 0001.
 */
export const merge = mutation({
  args: { survivorId: v.id("entreprises"), absorbedId: v.id("entreprises") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "entreprises");
    if (args.survivorId === args.absorbedId)
      throw new ConvexError("Impossible de fusionner une entreprise avec elle-même.");
    const survivor = await ctx.db.get(args.survivorId);
    const absorbed = await ctx.db.get(args.absorbedId);
    if (!survivor || survivor.deleted_at !== undefined)
      throw new ConvexError("Entreprise survivante introuvable");
    if (!absorbed || absorbed.deleted_at !== undefined)
      throw new ConvexError("Entreprise à fusionner introuvable");

    const toMove = await attachedContacts(ctx, args.absorbedId);
    const now = Date.now();
    for (const c of toMove) {
      await ctx.db.patch(c._id, {
        entreprise_id: args.survivorId,
        entreprise_nom: survivor.nom,
        updated_at: now,
      });
    }
    await ctx.db.patch(args.survivorId, {
      notes_md: resolveMergedNotes(survivor.notes_md, absorbed.notes_md),
      updated_at: now,
    });
    await ctx.db.patch(args.absorbedId, { deleted_at: now, updated_at: now });
    return { moved: toMove.length };
  },
});

/** Supprime une entreprise — refusé tant que des contacts y sont rattachés. */
export const remove = mutation({
  args: { id: v.id("entreprises") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "entreprises");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined)
      throw new ConvexError("Entreprise introuvable");
    const attached = await attachedContacts(ctx, args.id);
    assertEntrepriseDeletable(attached.length);
    await ctx.db.patch(args.id, { deleted_at: Date.now(), updated_at: Date.now() });
    return null;
  },
});
