import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  assertCurrencyCode,
  assertMoneyAmount,
  assertOptionalCurrencyCode,
  assertOptionalMoneyAmount,
  assertOptionalProbabilityPercent,
  assertOptionalTimestampMs,
  assertProbabilityPercent,
  currencyCode,
  dealStage,
  moneyAmount,
  probabilityPercent,
  timestampMs,
} from "./lib/validators";

// ---------------------------------------------------------------------------
// Stratégie d'ordre kanban
// `position` est un float. À l'insertion en index N de la colonne :
//   - colonne vide                 → position = STEP
//   - en tête (N == 0)             → position = first.position - STEP
//   - en queue (N == len)          → position = last.position + STEP
//   - au milieu                    → position = mid(prev, next)
// Aucune réécriture en masse ; l'ordre reste stable, les contentions sont
// minimisées.
// ---------------------------------------------------------------------------
const STEP = 1024;

// Un seuil de précaution : si l'écart entre voisins devient trop fin,
// on pourra relancer un compactage offline. Pas implémenté en v1.

function uniqueIds<T extends string>(ids: T[]) {
  return Array.from(new Set(ids));
}

function isClosedStage(stage: "signe" | "perdu" | "lead" | "qualifie" | "proposition" | "nego") {
  return stage === "signe" || stage === "perdu";
}

async function replaceDealContacts(
  ctx: MutationCtx,
  dealId: Id<"deals">,
  contactIds: Array<Id<"contacts">>,
  actorId: string,
) {
  const now = Date.now();
  const uniqueContactIds = uniqueIds(contactIds);
  const contacts = await Promise.all(uniqueContactIds.map((contactId) => ctx.db.get(contactId)));
  if (contacts.some((contact) => !contact || contact.deleted_at !== undefined)) {
    throw new Error("Contact de deal introuvable");
  }
  const existing = await ctx.db
    .query("deal_contacts")
    .withIndex("by_deal", (q) => q.eq("deal_id", dealId))
    .collect();
  await Promise.all(existing.map((link) => ctx.db.delete(link._id)));
  await Promise.all(
    uniqueContactIds.map((contactId, index) =>
      ctx.db.insert("deal_contacts", {
        deal_id: dealId,
        contact_id: contactId,
        role: index === 0 ? "primary" : "participant",
        is_primary: index === 0,
        assigned_by: actorId,
        created_at: now,
        updated_at: now,
      }),
    ),
  );
}

async function replaceDealTags(
  ctx: MutationCtx,
  dealId: Id<"deals">,
  tagIds: Array<Id<"tags">>,
  actorId: string,
) {
  const entity = { kind: "deal" as const, id: dealId };
  const tags = await Promise.all(tagIds.map((tagId) => ctx.db.get(tagId)));
  if (tags.some((tag) => !tag || tag.deleted_at !== undefined || tag.scope !== entity.kind)) {
    throw new Error("Tag incompatible avec un deal");
  }
  const existing = await ctx.db
    .query("entity_tags")
    .withIndex("by_entity", (q) => q.eq("entity.kind", entity.kind).eq("entity.id", entity.id))
    .collect();
  await Promise.all(existing.map((link) => ctx.db.delete(link._id)));
  const now = Date.now();
  await Promise.all(
    uniqueIds(tagIds).map((tagId) =>
      ctx.db.insert("entity_tags", {
        entity,
        tag_id: tagId,
        assigned_by: actorId,
        assigned_at: now,
      }),
    ),
  );
}

const dealCreateFields = {
  titre: v.string(),
  societe_id: v.id("societes"),
  contacts_ids: v.array(v.id("contacts")),
  montant: moneyAmount,
  devise: currencyCode,
  probabilite: probabilityPercent,
  stage: dealStage,
  date_closing_prevue: v.optional(timestampMs),
  owner_id: v.optional(v.string()), // par défaut = utilisateur courant
  tags: v.array(v.id("tags")),
  notes_md: v.optional(v.string()),
} as const;

const dealPatchFields = {
  titre: v.optional(v.string()),
  societe_id: v.optional(v.id("societes")),
  contacts_ids: v.optional(v.array(v.id("contacts"))),
  montant: v.optional(moneyAmount),
  devise: v.optional(currencyCode),
  probabilite: v.optional(probabilityPercent),
  date_closing_prevue: v.optional(timestampMs),
  owner_id: v.optional(v.string()),
  tags: v.optional(v.array(v.id("tags"))),
  notes_md: v.optional(v.string()),
  // pas de `stage` ici : passer par moveToStage()
} as const;

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    owner_id: v.optional(v.string()),
    tag_id: v.optional(v.id("tags")),
    stage: v.optional(dealStage),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const page = await ctx.db
      .query("deals")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(args.paginationOpts);
    const activePage = page.page.filter((d) => d.deleted_at === undefined);
    return {
      ...page,
      page: activePage.filter(
        (d) =>
          (!args.owner_id || d.owner_id === args.owner_id) &&
          (!args.tag_id || d.tags.includes(args.tag_id)) &&
          (!args.stage || d.stage === args.stage),
      ),
    };
  },
});

export const get = query({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    return row?.deleted_at === undefined ? row : null;
  },
});

/** Vue kanban : tous les deals (bornés à 1000), triés stage puis position. */
export const listForKanban = query({
  args: {
    owner_id: v.optional(v.string()),
    tag_id: v.optional(v.id("tags")),
    updated_since: v.optional(timestampMs),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    assertOptionalTimestampMs(args.updated_since, "updated_since");
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_stage_and_position")
      .order("asc")
      .take(1000);
    return deals.filter(
      (d) =>
        d.deleted_at === undefined &&
        (!args.owner_id || d.owner_id === args.owner_id) &&
        (!args.tag_id || d.tags.includes(args.tag_id)) &&
        (!args.updated_since || d.updated_at >= args.updated_since),
    );
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    if (!args.q.trim()) return [];
    const rows = await ctx.db
      .query("deals")
      .withSearchIndex("search_titre", (q) => q.search("titre", args.q))
      .take(10);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const listBySociete = query({
  args: { societe_id: v.id("societes") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("deals")
      .withIndex("by_societe", (q) => q.eq("societe_id", args.societe_id))
      .take(200);
    return rows.filter((row) => row.deleted_at === undefined);
  },
});

export const listByContact = query({
  args: { contact_id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const rows = await ctx.db.query("deals").withIndex("by_updated_at").order("desc").take(1000);
    const linkedRows = await ctx.db
      .query("deal_contacts")
      .withIndex("by_contact", (q) => q.eq("contact_id", args.contact_id))
      .take(1000);
    const linkedIds = new Set(linkedRows.map((link) => link.deal_id));
    return rows.filter(
      (d) =>
        d.deleted_at === undefined &&
        (linkedIds.has(d._id) || d.contacts_ids.includes(args.contact_id)),
    );
  },
});

export const create = mutation({
  args: dealCreateFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    assertMoneyAmount(args.montant, "montant");
    assertCurrencyCode(args.devise);
    assertProbabilityPercent(args.probabilite);
    assertOptionalTimestampMs(args.date_closing_prevue, "date_closing_prevue");
    const societe = await ctx.db.get(args.societe_id);
    if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");

    // Position : à la fin de la colonne du stage choisi
    const last = await ctx.db
      .query("deals")
      .withIndex("by_stage_and_position", (q) => q.eq("stage", args.stage))
      .order("desc")
      .first();
    const position = last ? last.position + STEP : STEP;

    const { owner_id, contacts_ids, ...rest } = args;
    const normalizedContactIds = uniqueIds(contacts_ids);
    const id = await ctx.db.insert("deals", {
      ...rest,
      contacts_ids: normalizedContactIds,
      owner_id: owner_id ?? userId,
      position,
      updated_by: userId,
      updated_at: now,
    });
    await replaceDealContacts(ctx, id, normalizedContactIds, userId);
    await replaceDealTags(ctx, id, args.tags, userId);
    await ctx.db.insert("activity_events", {
      entity: { kind: "deal", id },
      kind: "created",
      actor_id: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("deals"), patch: v.object(dealPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Deal introuvable");
    assertOptionalMoneyAmount(args.patch.montant, "montant");
    assertOptionalCurrencyCode(args.patch.devise);
    assertOptionalProbabilityPercent(args.patch.probabilite);
    assertOptionalTimestampMs(args.patch.date_closing_prevue, "date_closing_prevue");
    if (args.patch.societe_id !== undefined) {
      const societe = await ctx.db.get(args.patch.societe_id);
      if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    }
    const kind =
      args.patch.notes_md !== undefined && args.patch.notes_md !== existing.notes_md
        ? "note_added"
        : "updated";
    const patch = {
      ...args.patch,
      ...(args.patch.contacts_ids ? { contacts_ids: uniqueIds(args.patch.contacts_ids) } : {}),
    };
    await ctx.db.patch(args.id, { ...patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.contacts_ids !== undefined) {
      await replaceDealContacts(ctx, args.id, uniqueIds(args.patch.contacts_ids), userId);
    }
    if (args.patch.tags !== undefined) {
      await replaceDealTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "deal", id: args.id },
      kind,
      actor_id: userId,
      payload_json: JSON.stringify({ fields: Object.keys(args.patch) }),
    });
    return null;
  },
});

export const bulkUpdate = mutation({
  args: {
    ids: v.array(v.id("deals")),
    patch: v.object({
      owner_id: v.optional(v.string()),
      tags: v.optional(v.array(v.id("tags"))),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    await Promise.all(
      args.ids.map(async (id) => {
        const deal = await ctx.db.get(id);
        if (!deal) return;
        await ctx.db.patch(id, { ...args.patch, updated_by: userId, updated_at: now });
        if (args.patch.tags !== undefined) {
          await replaceDealTags(ctx, id, args.patch.tags, userId);
        }
        await ctx.db.insert("activity_events", {
          entity: { kind: "deal", id },
          kind: "updated",
          actor_id: userId,
          payload_json: JSON.stringify({ fields: Object.keys(args.patch) }),
        });
      }),
    );
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Deal introuvable");
    await ctx.db.patch(args.id, {
      deleted_at: Date.now(),
      deleted_by: userId,
      updated_by: userId,
      updated_at: Date.now(),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Drag-and-drop kanban
// ---------------------------------------------------------------------------

/**
 * Déplace un deal vers `newStage` à la position d'index `targetIndex`.
 * `targetIndex` est l'index final dans la colonne cible (0 = tête).
 * Fonctionne aussi pour un réordonnancement intra-colonne.
 *
 * Si on entre pour la première fois en stage `signe`, un Contrat est
 * automatiquement créé (cf. DECISIONS §P2 / §3.4).
 */
export const moveToStage = mutation({
  args: {
    dealId: v.id("deals"),
    newStage: dealStage,
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new Error("Deal introuvable");

    const oldStage = deal.stage;
    if (isClosedStage(oldStage) && !isClosedStage(args.newStage)) {
      throw new Error("Un deal signé ou perdu ne peut pas être rouvert sans règle de réouverture dédiée");
    }

    // Voisins triés dans la colonne cible, sans le deal qu'on déplace.
    // .take(1000) : capacité largement suffisante pour une colonne de kanban.
    const inTargetAll = await ctx.db
      .query("deals")
      .withIndex("by_stage_and_position", (q) => q.eq("stage", args.newStage))
      .order("asc")
      .take(1000);
    const inTarget = inTargetAll.filter((d) => d._id !== args.dealId);

    // Calcul de la position fractionnaire
    let newPosition: number;
    if (inTarget.length === 0) {
      newPosition = STEP;
    } else if (args.targetIndex <= 0) {
      newPosition = inTarget[0].position - STEP;
    } else if (args.targetIndex >= inTarget.length) {
      newPosition = inTarget[inTarget.length - 1].position + STEP;
    } else {
      const prev = inTarget[args.targetIndex - 1].position;
      const next = inTarget[args.targetIndex].position;
      newPosition = (prev + next) / 2;
    }

    const now = Date.now();
    const isClosing =
      (args.newStage === "signe" || args.newStage === "perdu") &&
      oldStage !== args.newStage;

    await ctx.db.patch(args.dealId, {
      stage: args.newStage,
      position: newPosition,
      updated_at: now,
      updated_by: userId,
      ...(isClosing ? { closed_at: now } : {}),
    });

    if (oldStage !== args.newStage) {
      await ctx.db.insert("activity_events", {
        entity: { kind: "deal", id: args.dealId },
        kind: "stage_changed",
        payload_json: JSON.stringify({ from: oldStage, to: args.newStage }),
        actor_id: userId,
      });

      // Auto-création du Contrat à l'entrée en `signe` (idempotent)
      if (args.newStage === "signe") {
        const existing = await ctx.db
          .query("contrats")
          .withIndex("by_deal", (q) => q.eq("deal_id", args.dealId))
          .first();
        if (!existing) {
          await ctx.db.insert("contrats", {
            deal_id: args.dealId,
            societe_id: deal.societe_id,
            date_signature: now,
            date_debut: now,
            montant_total: deal.montant,
            devise: deal.devise,
            frequence_facturation: "unique",
            statut: "actif",
            created_by: userId,
            updated_by: userId,
            updated_at: now,
          });
        }
      }
    }

    return null;
  },
});

export const findDuplicates = query({
  args: { titre: v.string(), societe_id: v.optional(v.id("societes")) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const needle = args.titre.trim().toLocaleLowerCase("fr-FR");
    const rows = await ctx.db.query("deals").withIndex("by_updated_at").order("desc").take(1000);
    return rows
      .filter(
        (d) =>
          d.deleted_at === undefined &&
          d.titre.trim().toLocaleLowerCase("fr-FR") === needle &&
          (!args.societe_id || d.societe_id === args.societe_id),
      )
      .slice(0, 5);
  },
});

export const merge = mutation({
  args: { id: v.id("deals"), patch: v.object(dealPatchFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Deal introuvable");
    assertOptionalMoneyAmount(args.patch.montant, "montant");
    assertOptionalCurrencyCode(args.patch.devise);
    assertOptionalProbabilityPercent(args.patch.probabilite);
    assertOptionalTimestampMs(args.patch.date_closing_prevue, "date_closing_prevue");
    if (args.patch.societe_id !== undefined) {
      const societe = await ctx.db.get(args.patch.societe_id);
      if (!societe || societe.deleted_at !== undefined) throw new Error("Société introuvable");
    }
    const patch = {
      ...args.patch,
      ...(args.patch.contacts_ids ? { contacts_ids: uniqueIds(args.patch.contacts_ids) } : {}),
    };
    await ctx.db.patch(args.id, { ...patch, updated_by: userId, updated_at: Date.now() });
    if (args.patch.contacts_ids !== undefined) {
      await replaceDealContacts(ctx, args.id, uniqueIds(args.patch.contacts_ids), userId);
    }
    if (args.patch.tags !== undefined) {
      await replaceDealTags(ctx, args.id, args.patch.tags, userId);
    }
    await ctx.db.insert("activity_events", {
      entity: { kind: "deal", id: args.id },
      kind: "merged",
      actor_id: userId,
    });
    return args.id;
  },
});
