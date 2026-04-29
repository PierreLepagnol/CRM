import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  assertOptionalMoneyAmount,
  assertOptionalNonNegativeNumber,
  moneyAmount,
} from "./lib/validators";

async function replaceSocieteTags(
  ctx: MutationCtx,
  societeId: Id<"societes">,
  tagIds: Array<Id<"tags">>,
  actorId: string,
) {
  const entity = { kind: "societe" as const, id: societeId };
  const tags = await Promise.all(tagIds.map((tagId) => ctx.db.get(tagId)));
  if (tags.some((tag) => !tag || tag.deleted_at !== undefined || tag.scope !== entity.kind)) {
    throw new Error("Tag incompatible avec une société");
  }
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

// Champs éditables d'une Société (sans audit / system)
const societeFields = {
  nom: v.string(),
  siret: v.optional(v.string()),
  forme_juridique: v.optional(v.string()),
  site_web: v.optional(v.string()),
  adresse: v.optional(v.string()),
  ville: v.optional(v.string()),
  code_postal: v.optional(v.string()),
  pays: v.optional(v.string()),
  secteur: v.optional(v.string()),
  effectif: v.optional(v.number()),
  ca_estime: v.optional(moneyAmount),
  notes_md: v.optional(v.string()),
  tags: v.array(v.id("tags")),
} as const;

// Variante "patch" : tous les champs optionnels
const societePatchFields = {
  nom: v.optional(v.string()),
  siret: v.optional(v.string()),
  forme_juridique: v.optional(v.string()),
  site_web: v.optional(v.string()),
  adresse: v.optional(v.string()),
  ville: v.optional(v.string()),
  code_postal: v.optional(v.string()),
  pays: v.optional(v.string()),
  secteur: v.optional(v.string()),
  effectif: v.optional(v.number()),
  ca_estime: v.optional(moneyAmount),
  notes_md: v.optional(v.string()),
  tags: v.optional(v.array(v.id("tags"))),
} as const;

export const list = query({
  args: { paginationOpts: paginationOptsValidator, tag_id: v.optional(v.id("tags")) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const page = await ctx.db
      .query("societes")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(args.paginationOpts);
    const activePage = page.page.filter((s) => s.deleted_at === undefined);
    if (!args.tag_id) return { ...page, page: activePage };
    return {
      ...page,
      page: activePage.filter((s) => s.tags.includes(args.tag_id!)),
    };
  },
});

export const get = query({
  args: { id: v.id("societes") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

/** Liste légère pour le picker de société dans les formulaires. */
export const listForPicker = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("societes")
      .withIndex("by_nom")
      .order("asc")
      .take(500);
    return rows
      .filter((s) => s.deleted_at === undefined)
      .map((s) => ({ _id: s._id, nom: s.nom }));
  },
});

export const create = mutation({
  args: societeFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    assertOptionalNonNegativeNumber(args.effectif, "effectif");
    assertOptionalMoneyAmount(args.ca_estime, "ca_estime");
    const id = await ctx.db.insert("societes", {
      ...args,
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    });
    await replaceSocieteTags(ctx, id, args.tags, userId);
    await ctx.db.insert("activity_events", {
      entity: { kind: "societe", id },
      kind: "created",
      actor_id: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("societes"), patch: v.object(societePatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Société introuvable");
    assertOptionalNonNegativeNumber(args.patch.effectif, "effectif");
    assertOptionalMoneyAmount(args.patch.ca_estime, "ca_estime");
    const kind =
      args.patch.notes_md !== undefined && args.patch.notes_md !== existing.notes_md
        ? "note_added"
        : "updated";
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.tags !== undefined) {
      await replaceSocieteTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "societe", id: args.id },
      kind,
      actor_id: userId,
      payload_json: JSON.stringify({ fields: Object.keys(args.patch) }),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("societes") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Société introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    return null;
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    if (!args.q.trim()) return [];
    const rows = await ctx.db
      .query("societes")
      .withSearchIndex("search_nom", (q) => q.search("nom", args.q))
      .take(10);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const findDuplicates = query({
  args: { nom: v.optional(v.string()), siret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const bySiret = args.siret
      ? await ctx.db
          .query("societes")
          .withIndex("by_siret", (q) => q.eq("siret", args.siret))
          .take(5)
      : [];
    const needle = args.nom?.trim().toLocaleLowerCase("fr-FR");
    const byName = needle
      ? (await ctx.db.query("societes").withIndex("by_nom").take(500)).filter(
      (s) => s.nom.trim().toLocaleLowerCase("fr-FR") === needle,
        )
      : [];
    return [...bySiret, ...byName].filter(
      (row) => row.deleted_at === undefined,
    ).filter(
      (row, index, rows) => rows.findIndex((r) => r._id === row._id) === index,
    );
  },
});

export const merge = mutation({
  args: { id: v.id("societes"), patch: v.object(societePatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Société introuvable");
    assertOptionalNonNegativeNumber(args.patch.effectif, "effectif");
    assertOptionalMoneyAmount(args.patch.ca_estime, "ca_estime");
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.tags !== undefined) {
      await replaceSocieteTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "societe", id: args.id },
      kind: "merged",
      actor_id: userId,
    });
    return args.id;
  },
});
