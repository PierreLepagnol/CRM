import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { requireUserId } from "./lib/auth";
import { assertMontant, projectStatut, projectType } from "./lib/validators";

async function getMaxPosition(ctx: MutationCtx, statut: string): Promise<number> {
  const row = await ctx.db
    .query("projects")
    .withIndex("by_statut_and_position", (q) => q.eq("statut", statut as any))
    .order("desc")
    .filter((q) => q.eq(q.field("deleted_at"), undefined))
    .first();
  return row ? row.position + 1 : 0;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!await authComponent.safeGetAuthUser(ctx)) return [];
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_updated_at")
      .order("desc")
      .collect();
    return rows.filter((p) => p.deleted_at === undefined);
  },
});

export const listByStatut = query({
  args: { statut: projectStatut },
  handler: async (ctx, args) => {
    if (!await authComponent.safeGetAuthUser(ctx)) return [];
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_statut_and_position", (q) => q.eq("statut", args.statut))
      .order("asc")
      .collect();
    return rows.filter((p) => p.deleted_at === undefined);
  },
});


export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    if (!await authComponent.safeGetAuthUser(ctx)) return null;
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
    const userId = await requireUserId(ctx);
    assertMontant(args.montant);
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
    await requireUserId(ctx);
    assertMontant(args.patch.montant);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined) throw new Error("Projet introuvable");
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
    await requireUserId(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.deleted_at !== undefined) throw new Error("Projet introuvable");

    const colItems = await ctx.db
      .query("projects")
      .withIndex("by_statut_and_position", (q) => q.eq("statut", args.newStatut))
      .order("asc")
      .filter((q) => q.eq(q.field("deleted_at"), undefined))
      .collect();

    const filtered = colItems.filter((p) => p._id !== args.id);
    const idx = Math.max(0, Math.min(args.targetIndex, filtered.length));
    filtered.splice(idx, 0, { ...project, statut: args.newStatut });

    await Promise.all(
      filtered.map((p, i) =>
        ctx.db.patch(p._id, { statut: args.newStatut, position: i, updated_at: Date.now() }),
      ),
    );
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Projet introuvable");
    await ctx.db.patch(args.id, { deleted_at: Date.now(), updated_at: Date.now() });
    return null;
  },
});
