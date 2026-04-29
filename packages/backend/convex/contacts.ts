import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { niveauDecision } from "./lib/validators";

async function replaceContactTags(
  ctx: MutationCtx,
  contactId: Id<"contacts">,
  tagIds: Array<Id<"tags">>,
  actorId: string,
) {
  const entity = { kind: "contact" as const, id: contactId };
  const tags = await Promise.all(tagIds.map((tagId) => ctx.db.get(tagId)));
  if (tags.some((tag) => !tag || tag.deleted_at !== undefined || tag.scope !== entity.kind)) {
    throw new Error("Tag incompatible avec un contact");
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

const contactFields = {
  societe_id: v.optional(v.id("societes")),
  civilite: v.optional(v.string()),
  prenom: v.string(),
  nom: v.string(),
  photo_url: v.optional(v.string()),
  intitule_poste: v.optional(v.string()),
  niveau_decision: v.optional(niveauDecision),
  email: v.optional(v.string()),
  telephones: v.array(v.string()),
  linkedin_url: v.optional(v.string()),
  notes_md: v.optional(v.string()),
  langue: v.optional(v.string()),
  anniversaire: v.optional(v.string()),
  tags: v.array(v.id("tags")),
} as const;

const contactPatchFields = {
  societe_id: v.optional(v.id("societes")),
  civilite: v.optional(v.string()),
  prenom: v.optional(v.string()),
  nom: v.optional(v.string()),
  photo_url: v.optional(v.string()),
  intitule_poste: v.optional(v.string()),
  niveau_decision: v.optional(niveauDecision),
  email: v.optional(v.string()),
  telephones: v.optional(v.array(v.string())),
  linkedin_url: v.optional(v.string()),
  notes_md: v.optional(v.string()),
  langue: v.optional(v.string()),
  anniversaire: v.optional(v.string()),
  tags: v.optional(v.array(v.id("tags"))),
} as const;

export const list = query({
  args: { paginationOpts: paginationOptsValidator, tag_id: v.optional(v.id("tags")) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const page = await ctx.db
      .query("contacts")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(args.paginationOpts);
    const activePage = page.page.filter((c) => c.deleted_at === undefined);
    if (!args.tag_id) return { ...page, page: activePage };
    return {
      ...page,
      page: activePage.filter((c) => c.tags.includes(args.tag_id!)),
    };
  },
});

export const listByDeal = query({
  args: { deal_id: v.id("deals") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const deal = await ctx.db.get(args.deal_id);
    if (!deal) return [];
    const links = await ctx.db
      .query("deal_contacts")
      .withIndex("by_deal", (q) => q.eq("deal_id", args.deal_id))
      .take(200);
    const contactIds =
      links.length > 0
        ? links
            .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
            .map((link) => link.contact_id)
        : deal.contacts_ids;
    const contacts = await Promise.all(contactIds.map((id) => ctx.db.get(id)));
    return contacts.filter((contact): contact is Doc<"contacts"> => contact !== null && contact.deleted_at === undefined);
  },
});

export const listBySociete = query({
  args: { societe_id: v.id("societes") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_societe", (q) => q.eq("societe_id", args.societe_id))
      .take(200);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const get = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

export const create = mutation({
  args: contactFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    if (args.societe_id !== undefined) {
      const societe = await ctx.db.get(args.societe_id);
      if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    }
    const id = await ctx.db.insert("contacts", {
      ...args,
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    });
    await replaceContactTags(ctx, id, args.tags, userId);
    await ctx.db.insert("activity_events", {
      entity: { kind: "contact", id },
      kind: "created",
      actor_id: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("contacts"), patch: v.object(contactPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contact introuvable");
    if (args.patch.societe_id !== undefined) {
      const societe = await ctx.db.get(args.patch.societe_id);
      if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    }
    const kind =
      args.patch.notes_md !== undefined && args.patch.notes_md !== existing.notes_md
        ? "note_added"
        : "updated";
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.tags !== undefined) {
      await replaceContactTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "contact", id: args.id },
      kind,
      actor_id: userId,
      payload_json: JSON.stringify({ fields: Object.keys(args.patch) }),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contact introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    return null;
  },
});

/** Liste légère pour pickers (participants de réunion, etc.). */
export const listForPicker = query({
  args: { societe_id: v.optional(v.id("societes")) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    if (args.societe_id) {
      const rows = await ctx.db
        .query("contacts")
        .withIndex("by_societe", (q) => q.eq("societe_id", args.societe_id!))
        .take(200);
      return rows
        .filter((c) => c.deleted_at === undefined)
        .map((c) => ({ _id: c._id, prenom: c.prenom, nom: c.nom, email: c.email }));
    }
    const rows = await ctx.db.query("contacts").withIndex("by_updated_at").order("desc").take(500);
    return rows
      .filter((c) => c.deleted_at === undefined)
      .map((c) => ({ _id: c._id, prenom: c.prenom, nom: c.nom, email: c.email }));
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    if (!args.q.trim()) return [];
    const rows = await ctx.db
      .query("contacts")
      .withSearchIndex("search_full_name", (q) => q.search("nom", args.q))
      .take(10);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

/** Recherche d'un contact par e-mail (pour la dédup à la création / import). */
export const findByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    return row?.deleted_at === undefined ? row : null;
  },
});

export const findDuplicates = query({
  args: {
    email: v.optional(v.string()),
    prenom: v.optional(v.string()),
    nom: v.optional(v.string()),
    societe_id: v.optional(v.id("societes")),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const byEmail = args.email
      ? await ctx.db
          .query("contacts")
          .withIndex("by_email", (q) => q.eq("email", args.email))
          .take(5)
      : [];
    const first = args.prenom?.trim().toLocaleLowerCase("fr-FR");
    const last = args.nom?.trim().toLocaleLowerCase("fr-FR");
    const byName =
      first && last
        ? (await ctx.db.query("contacts").withIndex("by_updated_at").order("desc").take(500)).filter(
            (c) =>
              c.prenom.trim().toLocaleLowerCase("fr-FR") === first &&
              c.nom.trim().toLocaleLowerCase("fr-FR") === last &&
              (!args.societe_id || c.societe_id === args.societe_id),
          )
        : [];
    return [...byEmail, ...byName].filter((row) => row.deleted_at === undefined).filter(
      (row, index, rows) => rows.findIndex((r) => r._id === row._id) === index,
    );
  },
});

export const merge = mutation({
  args: { id: v.id("contacts"), patch: v.object(contactPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Contact introuvable");
    if (args.patch.societe_id !== undefined) {
      const societe = await ctx.db.get(args.patch.societe_id);
      if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    }
    await ctx.db.patch(args.id, { ...args.patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.tags !== undefined) {
      await replaceContactTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "contact", id: args.id },
      kind: "merged",
      actor_id: userId,
    });
    return args.id;
  },
});
