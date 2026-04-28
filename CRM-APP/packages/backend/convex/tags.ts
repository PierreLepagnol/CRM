import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { entityRef, tagScope } from "./lib/validators";

type TaggableEntity =
  | { kind: "societe"; id: Id<"societes"> }
  | { kind: "contact"; id: Id<"contacts"> }
  | { kind: "deal"; id: Id<"deals"> };

function entityKey(entity: TaggableEntity) {
  return `${entity.kind}:${entity.id}`;
}

function tagScopeMatchesEntity(tagScopeValue: "societe" | "contact" | "deal", entity: TaggableEntity) {
  return tagScopeValue === entity.kind;
}

async function replaceEntityTags(
  ctx: MutationCtx,
  entity: TaggableEntity,
  tagIds: Array<Id<"tags">>,
  actorId: string,
) {
  const existing = await ctx.db
    .query("entity_tags")
    .withIndex("by_entity", (q) => q.eq("entity.kind", entity.kind).eq("entity.id", entity.id))
    .collect();
  await Promise.all(existing.map((link) => ctx.db.delete(link._id)));
  const now = Date.now();
  await Promise.all(
    Array.from(new Set(tagIds)).map((tagId) =>
      ctx.db.insert("entity_tags", {
        entity,
        tag_id: tagId,
        assigned_by: actorId,
        assigned_at: now,
      }),
    ),
  );
}

export const list = query({
  args: { scope: v.optional(tagScope) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    if (args.scope) {
      const rows = await ctx.db
        .query("tags")
        .withIndex("by_scope_and_label", (q) => q.eq("scope", args.scope!))
        .order("asc")
        .take(500);
      return rows.filter((row) => row.deleted_at === undefined);
    }
    const rows = await ctx.db.query("tags").withIndex("by_label").order("asc").take(500);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const listWithUsage = query({
  args: { scope: v.optional(tagScope) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const tags = args.scope
      ? await ctx.db
          .query("tags")
          .withIndex("by_scope_and_label", (q) => q.eq("scope", args.scope!))
          .order("asc")
          .take(500)
      : await ctx.db.query("tags").withIndex("by_label").order("asc").take(500);
    const activeTags = tags.filter((tag) => tag.deleted_at === undefined);

    const [societes, contacts, deals, entityTags] = await Promise.all([
      ctx.db.query("societes").take(5000),
      ctx.db.query("contacts").take(5000),
      ctx.db.query("deals").take(5000),
      ctx.db.query("entity_tags").take(10000),
    ]);

    return activeTags.map((tag) => {
      const entities = new Set(
        entityTags
          .filter((link) => link.tag_id === tag._id)
          .map((link) => entityKey(link.entity)),
      );
      if (tag.scope === "societe") {
        for (const societe of societes) {
          if (societe.tags.includes(tag._id)) entities.add(entityKey({ kind: "societe", id: societe._id }));
        }
      } else if (tag.scope === "contact") {
        for (const contact of contacts) {
          if (contact.tags.includes(tag._id)) entities.add(entityKey({ kind: "contact", id: contact._id }));
        }
      } else {
        for (const deal of deals) {
          if (deal.tags.includes(tag._id)) entities.add(entityKey({ kind: "deal", id: deal._id }));
        }
      }
      return { ...tag, usage: entities.size };
    });
  },
});

export const create = mutation({
  args: { label: v.string(), couleur: v.string(), scope: tagScope },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    return await ctx.db.insert("tags", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("tags"),
    patch: v.object({
      label: v.optional(v.string()),
      couleur: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const [societes, contacts, deals, entityTagLinks] = await Promise.all([
      ctx.db.query("societes").take(5000),
      ctx.db.query("contacts").take(5000),
      ctx.db.query("deals").take(5000),
      ctx.db.query("entity_tags").withIndex("by_tag", (q) => q.eq("tag_id", args.id)).collect(),
    ]);
    await Promise.all([
      ...entityTagLinks.map((link) => ctx.db.delete(link._id)),
      ...societes
        .filter((s) => s.tags.includes(args.id))
        .map((s) => ctx.db.patch(s._id, { tags: s.tags.filter((id) => id !== args.id) })),
      ...contacts
        .filter((c) => c.tags.includes(args.id))
        .map((c) => ctx.db.patch(c._id, { tags: c.tags.filter((id) => id !== args.id) })),
      ...deals
        .filter((d) => d.tags.includes(args.id))
        .map((d) => ctx.db.patch(d._id, { tags: d.tags.filter((id) => id !== args.id) })),
    ]);
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
    });
    return null;
  },
});

export const setForEntity = mutation({
  args: {
    tagIds: v.array(v.id("tags")),
    entity: entityRef,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tagIds = Array.from(new Set(args.tagIds));
    const tags = await Promise.all(tagIds.map((id) => ctx.db.get(id)));
    const invalidTag = tags.find(
      (tag) => !tag || tag.deleted_at !== undefined || !tagScopeMatchesEntity(tag.scope, args.entity),
    );
    if (invalidTag !== undefined) {
      throw new Error("Tag incompatible avec le type d'entité ciblé");
    }
    if (args.entity.kind === "societe") {
      await ctx.db.patch(args.entity.id, { tags: tagIds, updated_at: Date.now() });
    } else if (args.entity.kind === "contact") {
      await ctx.db.patch(args.entity.id, { tags: tagIds, updated_at: Date.now() });
    } else {
      await ctx.db.patch(args.entity.id, { tags: tagIds, updated_at: Date.now() });
    }
    await replaceEntityTags(ctx, args.entity, tagIds, userId);
    await ctx.db.insert("activity_events", {
      entity: args.entity,
      kind: "updated",
      actor_id: userId,
      payload_json: JSON.stringify({ field: "tags" }),
    });
    return null;
  },
});
