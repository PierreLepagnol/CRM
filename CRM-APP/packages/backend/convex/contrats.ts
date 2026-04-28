import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  assertCurrencyCode,
  assertMoneyAmount,
  assertOptionalCurrencyCode,
  assertOptionalMoneyAmount,
  assertOptionalTimestampMs,
  assertTimestampMs,
  contratStatut,
  currencyCode,
  frequenceFacturation,
  moneyAmount,
  timestampMs,
} from "./lib/validators";

const contratFields = {
  deal_id: v.id("deals"),
  societe_id: v.id("societes"),
  date_signature: timestampMs,
  date_debut: timestampMs,
  date_fin: v.optional(timestampMs),
  montant_total: moneyAmount,
  devise: currencyCode,
  frequence_facturation: frequenceFacturation,
  tva: v.optional(v.number()),
  statut: contratStatut,
} as const;

const contratPatchFields = {
  date_signature: v.optional(timestampMs),
  date_debut: v.optional(timestampMs),
  date_fin: v.optional(timestampMs),
  montant_total: v.optional(moneyAmount),
  devise: v.optional(currencyCode),
  frequence_facturation: v.optional(frequenceFacturation),
  tva: v.optional(v.number()),
  statut: v.optional(contratStatut),
} as const;

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const page = await ctx.db
      .query("contrats")
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: page.page.filter((row) => row.deleted_at === undefined) };
  },
});

export const get = query({
  args: { id: v.id("contrats") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

export const getByDeal = query({
  args: { deal_id: v.id("deals") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db
      .query("contrats")
      .withIndex("by_deal", (q) => q.eq("deal_id", args.deal_id))
      .first();
    return row?.deleted_at === undefined ? row : null;
  },
});

export const listBySociete = query({
  args: { societe_id: v.id("societes") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("contrats")
      .withIndex("by_societe", (q) => q.eq("societe_id", args.societe_id))
      .take(200);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

/**
 * Création manuelle d'un contrat (cas rare : la voie principale est
 * l'auto-création depuis `deals.moveToStage` quand le deal passe en `signe`).
 */
export const create = mutation({
  args: contratFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertTimestampMs(args.date_signature, "date_signature");
    assertTimestampMs(args.date_debut, "date_debut");
    assertOptionalTimestampMs(args.date_fin, "date_fin");
    assertMoneyAmount(args.montant_total, "montant_total");
    assertCurrencyCode(args.devise);
    const [deal, societe] = await Promise.all([
      ctx.db.get(args.deal_id),
      ctx.db.get(args.societe_id),
    ]);
    if (!deal || deal.deleted_at !== undefined) throw new Error("Deal introuvable");
    if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    if (deal.societe_id !== args.societe_id) {
      throw new Error("La société du contrat doit correspondre à la société du deal");
    }
    const existing = await ctx.db
      .query("contrats")
      .withIndex("by_deal", (q) => q.eq("deal_id", args.deal_id))
      .first();
    if (existing && existing.deleted_at === undefined) {
      throw new Error("Un contrat actif existe déjà pour ce deal");
    }
    return await ctx.db.insert("contrats", {
      ...args,
      created_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("contrats"), patch: v.object(contratPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contrat introuvable");
    assertOptionalTimestampMs(args.patch.date_signature, "date_signature");
    assertOptionalTimestampMs(args.patch.date_debut, "date_debut");
    assertOptionalTimestampMs(args.patch.date_fin, "date_fin");
    assertOptionalMoneyAmount(args.patch.montant_total, "montant_total");
    assertOptionalCurrencyCode(args.patch.devise);
    if (
      existing.statut === "termine" &&
      args.patch.statut !== undefined &&
      args.patch.statut !== "termine"
    ) {
      throw new Error("Un contrat terminé ne peut pas être réactivé sans règle dédiée");
    }
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("contrats") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contrat introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    return null;
  },
});
