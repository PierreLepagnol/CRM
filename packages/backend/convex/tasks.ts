import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertOptionalTimestampMs, entityRef, taskStatus, timestampMs } from "./lib/validators";

const taskFields = {
  entity: entityRef,
  source_reunion_id: v.optional(v.id("reunions")),
  title: v.string(),
  due_at: v.optional(timestampMs),
  owner_id: v.optional(v.string()),
} as const;

const taskPatchFields = {
  title: v.optional(v.string()),
  due_at: v.optional(timestampMs),
  owner_id: v.optional(v.string()),
  status: v.optional(taskStatus),
} as const;

export const listByEntity = query({
  args: { entity: entityRef },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_entity", (q) =>
        q.eq("entity.kind", args.entity.kind).eq("entity.id", args.entity.id),
      )
      .take(200);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const listDue = query({
  args: {
    to: timestampMs,
    owner_id: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    assertOptionalTimestampMs(args.to, "to");
    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_due_status", (q) => q.eq("status", "open").lte("due_at", args.to))
      .paginate(args.paginationOpts);
    return {
      ...rows,
      page: rows.page.filter(
        (row) =>
          row.deleted_at === undefined &&
          row.due_at !== undefined &&
          (!args.owner_id || row.owner_id === args.owner_id),
      ),
    };
  },
});

export const create = mutation({
  args: taskFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertOptionalTimestampMs(args.due_at, "due_at");
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      ...args,
      status: "open",
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("tasks"), patch: v.object(taskPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.deleted_at !== undefined) throw new Error("Tâche introuvable");
    assertOptionalTimestampMs(args.patch.due_at, "due_at");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      ...args.patch,
      completed_at:
        args.patch.status === "done"
          ? now
          : args.patch.status === "open"
            ? undefined
            : existing.completed_at,
      updated_by: userId,
      updated_at: now,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Tâche introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    return null;
  },
});
