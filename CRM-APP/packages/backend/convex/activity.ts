import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { entityRef } from "./lib/validators";

/** Timeline d'une fiche : événements les plus récents d'abord. */
export const listForEntity = query({
  args: { entity: entityRef, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    return await ctx.db
      .query("activity_events")
      .withIndex("by_entity", (q) =>
        q
          .eq("entity.kind", args.entity.kind)
          .eq("entity.id", args.entity.id),
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});
