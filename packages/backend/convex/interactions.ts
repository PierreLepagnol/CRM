import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { requireUserId } from "./lib/auth";
import { interactionType } from "./lib/validators";

export const listByContact = query({
  args: { contact_id: v.id("contacts") },
  handler: async (ctx, args) => {
    if (!await authComponent.safeGetAuthUser(ctx)) return [];
    const rows = await ctx.db
      .query("interactions")
      .withIndex("by_contact_and_date", (q) => q.eq("contact_id", args.contact_id))
      .order("desc")
      .collect();
    return rows;
  },
});

export const create = mutation({
  args: {
    contact_id: v.id("contacts"),
    type: interactionType,
    date_at: v.number(),
    resume: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const contact = await ctx.db.get(args.contact_id);
    if (!contact || contact.deleted_at !== undefined) throw new Error("Contact introuvable");
    const id = await ctx.db.insert("interactions", {
      contact_id: args.contact_id,
      type: args.type,
      date_at: args.date_at,
      resume: args.resume,
      created_by: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("interactions"), resume: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    await ctx.db.patch(args.id, { resume: args.resume });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("interactions") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
