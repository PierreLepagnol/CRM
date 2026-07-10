import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { hasPageAccess, requirePageAccess } from "./access";
import { requireUserId } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";
import { movesFromPlan } from "./lib/position";
import {
  assertMontant,
  assertOptionalTimestampMs,
  LIST_CAP,
  projectStatut,
  projectType,
} from "./lib/validators";

async function getMaxPosition(
  ctx: MutationCtx,
  statut: Doc<"projects">["statut"],
): Promise<number> {
  const row = await ctx.db
    .query("projects")
    .withIndex("by_active_statut_position", (q) =>
      q.eq("deleted_at", undefined).eq("statut", statut),
    )
    .order("desc")
    .first();
  return row ? row.position + 1 : 0;
}

async function guardProjetsRead(ctx: Parameters<typeof hasPageAccess>[0]) {
  const access = await hasPageAccess(ctx, "projets");
  if (access === null) return false; // non authentifié → chargement
  if (!access) throw new ConvexError("Accès refusé");
  return true;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await guardProjetsRead(ctx))) return [];
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_active_updated", (q) => q.eq("deleted_at", undefined))
      .order("desc")
      .take(LIST_CAP);
    return rows;
  },
});

export const listByStatut = query({
  args: { statut: projectStatut },
  handler: async (ctx, args) => {
    if (!(await guardProjetsRead(ctx))) return [];
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_active_statut_position", (q) =>
        q.eq("deleted_at", undefined).eq("statut", args.statut),
      )
      .order("asc")
      .take(LIST_CAP);
    return rows;
  },
});


export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const access = await hasPageAccess(ctx, "projets");
    if (access === null) return null;
    if (!access) throw new ConvexError("Accès refusé");
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

const projectFields = {
  titre: v.string(),
  type: projectType,
  client: v.optional(v.string()),
  montant: v.optional(v.number()),
  statut: projectStatut,
  description_md: v.optional(v.string()),
  date_debut: v.optional(v.number()),
  date_fin_prevue: v.optional(v.number()),
  contact_id: v.optional(v.id("contacts")),
} as const;

const projectPatchFields = {
  titre: v.optional(v.string()),
  type: v.optional(projectType),
  client: v.optional(v.string()),
  montant: v.optional(v.number()),
  statut: v.optional(projectStatut),
  description_md: v.optional(v.string()),
  date_debut: v.optional(v.number()),
  date_fin_prevue: v.optional(v.number()),
  contact_id: v.optional(v.id("contacts")),
} as const;

export const create = mutation({
  args: projectFields,
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "projets");
    const userId = await requireUserId(ctx);
    assertMontant(args.montant);
    assertOptionalTimestampMs(args.date_debut, "date_debut");
    assertOptionalTimestampMs(args.date_fin_prevue, "date_fin_prevue");
    const position = await getMaxPosition(ctx, args.statut);
    const id = await ctx.db.insert("projects", {
      ...args,
      position,
      created_by: userId,
      updated_at: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("projects"), patch: v.object(projectPatchFields) },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "projets");
    await requireUserId(ctx);
    assertMontant(args.patch.montant);
    assertOptionalTimestampMs(args.patch.date_debut, "date_debut");
    assertOptionalTimestampMs(args.patch.date_fin_prevue, "date_fin_prevue");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined) throw new ConvexError("Projet introuvable");
    const nextPosition =
      args.patch.statut !== undefined && args.patch.statut !== existing.statut
        ? await getMaxPosition(ctx, args.patch.statut)
        : existing.position;
    await ctx.db.patch(args.id, {
      ...args.patch,
      position: nextPosition,
      updated_at: Date.now(),
    });
    return null;
  },
});

export const moveToStatut = mutation({
  args: {
    id: v.id("projects"),
    newStatut: projectStatut,
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "projets");
    await requireUserId(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.deleted_at !== undefined) throw new ConvexError("Projet introuvable");

    const colItems = await ctx.db
      .query("projects")
      .withIndex("by_active_statut_position", (q) =>
        q.eq("deleted_at", undefined).eq("statut", args.newStatut),
      )
      .order("asc")
      .take(LIST_CAP);

    // Indexation fractionnaire : un déplacement = une écriture (cf. lib/position).
    const others = colItems
      .filter((p) => p._id !== args.id)
      .map((p) => ({ id: p._id as string, position: p.position }));
    const writes = movesFromPlan(
      others,
      args.targetIndex,
      args.id,
      "statut",
      args.newStatut,
      Date.now(),
    );
    await Promise.all(writes.map((w) => ctx.db.patch(w.id as Id<"projects">, w.patch)));
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, "projets");
    await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Projet introuvable");
    await ctx.db.patch(args.id, { deleted_at: Date.now(), updated_at: Date.now() });
    return null;
  },
});
