import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { guardContactRead, requireContactWrite } from "./access";
import { requireUserId } from "./lib/auth";
import { assertTimestampMs, interactionType } from "./lib/validators";

export const listByContact = query({
  args: { contact_id: v.id("contacts") },
  handler: async (ctx, args) => {
    if (!(await guardContactRead(ctx))) return [];
    const contact = await ctx.db.get(args.contact_id);
    if (!contact || contact.deleted_at !== undefined) return [];
    return await ctx.db
      .query("interactions")
      .withIndex("by_contact_and_date", (q) => q.eq("contact_id", args.contact_id))
      .order("desc")
      .take(500);
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
    await requireContactWrite(ctx);
    const userId = await requireUserId(ctx);
    assertTimestampMs(args.date_at, "date_at");
    const contact = await ctx.db.get(args.contact_id);
    if (!contact || contact.deleted_at !== undefined)
      throw new ConvexError("Contact introuvable");
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
    await requireContactWrite(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Interaction introuvable");
    await ctx.db.patch(args.id, { resume: args.resume });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("interactions") },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Interaction introuvable");
    await ctx.db.delete(args.id);
    return null;
  },
});
