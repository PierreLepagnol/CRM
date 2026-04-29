import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  assertDurationMinutes,
  assertOptionalDurationMinutes,
  assertOptionalTimestampMs,
  assertTimestampMs,
  durationMinutes,
  entityRef,
  nextStep,
  timestampMs,
} from "./lib/validators";

type EntityRef =
  | { kind: "societe"; id: Id<"societes"> }
  | { kind: "contact"; id: Id<"contacts"> }
  | { kind: "deal"; id: Id<"deals"> };

type NextStep = {
  description: string;
  due_date?: number;
  owner_id?: string;
  done: boolean;
};

async function replaceReunionTasks(
  ctx: MutationCtx,
  reunionId: Id<"reunions">,
  entity: EntityRef,
  nextSteps: NextStep[],
  actorId: string,
) {
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_source_reunion", (q) => q.eq("source_reunion_id", reunionId))
    .collect();
  const now = Date.now();
  await Promise.all(
    existing.map((task) =>
      ctx.db.patch(task._id, {
        deleted_at: now,
        deleted_by: actorId,
        updated_by: actorId,
        updated_at: now,
      }),
    ),
  );
  await Promise.all(
    nextSteps.map((step, index) =>
      ctx.db.insert("tasks", {
        entity,
        source_reunion_id: reunionId,
        source_next_step_index: index,
        title: step.description,
        due_at: step.due_date,
        owner_id: step.owner_id,
        status: step.done ? "done" : "open",
        completed_at: step.done ? now : undefined,
        created_by: actorId,
        updated_by: actorId,
        updated_at: now,
      }),
    ),
  );
}

const reunionFields = {
  attached_to: entityRef,
  date: timestampMs,
  duree_minutes: durationMinutes,
  lieu_ou_url: v.optional(v.string()),
  participants_ids: v.array(v.id("contacts")),
  compte_rendu_md: v.optional(v.string()),
  next_steps: v.array(nextStep),
} as const;

const reunionPatchFields = {
  date: v.optional(timestampMs),
  duree_minutes: v.optional(durationMinutes),
  lieu_ou_url: v.optional(v.string()),
  participants_ids: v.optional(v.array(v.id("contacts"))),
  compte_rendu_md: v.optional(v.string()),
  next_steps: v.optional(v.array(nextStep)),
} as const;

/** Liste des réunions rattachées à une fiche, plus récentes d'abord. */
export const listByEntity = query({
  args: { entity: entityRef },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("reunions")
      .withIndex("by_attached_kind_and_id_and_date", (q) =>
        q
          .eq("attached_to.kind", args.entity.kind)
          .eq("attached_to.id", args.entity.id),
      )
      .order("desc")
      .take(200);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

/** Calendrier : réunions sur une plage de dates. */
export const listByDateRange = query({
  args: { from: timestampMs, to: timestampMs },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    assertTimestampMs(args.from, "from");
    assertTimestampMs(args.to, "to");
    const rows = await ctx.db
      .query("reunions")
      .withIndex("by_date", (q) => q.gte("date", args.from).lte("date", args.to))
      .take(500);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const get = query({
  args: { id: v.id("reunions") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

export const create = mutation({
  args: reunionFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    assertTimestampMs(args.date, "date");
    assertDurationMinutes(args.duree_minutes);
    for (const [index, step] of args.next_steps.entries()) {
      assertOptionalTimestampMs(step.due_date, `next_steps[${index}].due_date`);
    }
    const id = await ctx.db.insert("reunions", {
      ...args,
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    });
    await replaceReunionTasks(ctx, id, args.attached_to, args.next_steps, userId);
    // Trace dans la timeline de la fiche rattachée
    await ctx.db.insert("activity_events", {
      entity: args.attached_to,
      kind: "meeting_logged",
      payload_json: JSON.stringify({ reunion_id: id, date: args.date }),
      actor_id: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("reunions"), patch: v.object(reunionPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Réunion introuvable");
    assertOptionalTimestampMs(args.patch.date, "date");
    assertOptionalDurationMinutes(args.patch.duree_minutes);
    for (const [index, step] of (args.patch.next_steps ?? []).entries()) {
      assertOptionalTimestampMs(step.due_date, `next_steps[${index}].due_date`);
    }
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.next_steps !== undefined) {
      await replaceReunionTasks(ctx, args.id, existing.attached_to, args.patch.next_steps, userId);
    }
    return null;
  },
});

export const toggleNextStep = mutation({
  args: { id: v.id("reunions"), index: v.number(), done: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reunion = await ctx.db.get(args.id);
    if (!reunion) throw new Error("Réunion introuvable");
    const next_steps = reunion.next_steps.map((step, index) =>
      index === args.index ? { ...step, done: args.done } : step,
    );
    await ctx.db.patch(args.id, { next_steps, updated_at: Date.now() });
    await replaceReunionTasks(ctx, args.id, reunion.attached_to, next_steps, userId);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("reunions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Réunion introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_source_reunion", (q) => q.eq("source_reunion_id", args.id))
      .collect();
    await Promise.all(
      tasks.map((task) =>
        ctx.db.patch(task._id, {
          deleted_at: Date.now(),
          deleted_by: userId,
          updated_by: userId,
          updated_at: Date.now(),
        }),
      ),
    );
    return null;
  },
});
