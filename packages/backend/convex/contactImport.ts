import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireContactWrite } from "./access";
import { normalizeEntrepriseName } from "./lib/entrepriseLogic";
import {
  buildClassifyContext,
  buildEnrichmentPatch,
  classifyRow,
  collapseByEmail,
  type ClassifyContext,
  type FieldStrategies,
  type ImportRowInput,
} from "./lib/importLogic";
import { requireUserId } from "./lib/auth";

/**
 * Import en masse de contacts (CSV/XLSX → Prospect). Fines adaptations Convex de
 * la logique pure `lib/importLogic.ts`. Cf. CONTEXT.md (Import, Doublon,
 * Enrichissement) et docs/adr/0002-import-contacts-dedup-et-fusion.md.
 */

/** Plafond dur : au-delà, le commit ne tiendrait plus en une transaction atomique. */
export const MAX_IMPORT_ROWS = 500;

const importRowValidator = v.object({
  prenom: v.optional(v.string()),
  nom: v.optional(v.string()),
  email: v.optional(v.string()),
  telephone: v.optional(v.string()),
  linkedin_url: v.optional(v.string()),
  poste: v.optional(v.string()),
  entreprise: v.optional(v.string()),
  montant: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const mergeStrategy = v.union(
  v.literal("fill_if_empty"),
  v.literal("overwrite"),
  v.literal("ignore"),
);

const fieldStrategiesValidator = v.object({
  email: v.optional(mergeStrategy),
  telephone: v.optional(mergeStrategy),
  linkedin_url: v.optional(mergeStrategy),
  poste: v.optional(mergeStrategy),
  montant: v.optional(mergeStrategy),
  entreprise: v.optional(mergeStrategy),
  notes: v.optional(mergeStrategy),
});

/** Décision de revue pour un nom d'Entreprise non reconnu (jamais créé en silence). */
const entrepriseResolutionValidator = v.object({
  nom: v.string(),
  action: v.union(
    v.object({ kind: v.literal("existing"), entreprise_id: v.id("entreprises") }),
    v.object({ kind: v.literal("create") }),
    v.object({ kind: v.literal("skip") }),
  ),
});

/** Charge les index de rapprochement depuis la base (contacts + entreprises non supprimés). */
async function loadClassifyContext(ctx: MutationCtx): Promise<ClassifyContext> {
  const contacts = (await ctx.db.query("contacts").collect()).filter(
    (c) => c.deleted_at === undefined,
  );
  const entreprises = (await ctx.db.query("entreprises").collect()).filter(
    (e) => e.deleted_at === undefined,
  );
  return buildClassifyContext({
    contacts: contacts.map((c) => ({ id: c._id, email: c.email })),
    entreprises: entreprises.map((e) => ({ id: e._id, nom: e.nom })),
  });
}

/**
 * Préclassement (préchargement indicatif) : fusionne les doublons intra-fichier,
 * puis classe chaque ligne (Création / Enrichissement / erreur) et résout les
 * Entreprises. Le commit re-valide de façon autoritaire — la base peut changer
 * entre la revue et l'écriture (cf. ADR 0002).
 */
export const classify = query({
  args: { rows: v.array(importRowValidator) },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    if (args.rows.length > MAX_IMPORT_ROWS)
      throw new ConvexError(`Fichier trop volumineux (max ${MAX_IMPORT_ROWS} lignes).`);

    const contacts = (await ctx.db.query("contacts").collect()).filter(
      (c) => c.deleted_at === undefined,
    );
    const entreprises = (await ctx.db.query("entreprises").collect()).filter(
      (e) => e.deleted_at === undefined,
    );
    const context = buildClassifyContext({
      contacts: contacts.map((c) => ({ id: c._id, email: c.email })),
      entreprises: entreprises.map((e) => ({ id: e._id, nom: e.nom })),
    });
    const byId = new Map(contacts.map((c) => [c._id as string, c]));

    const { rows, warnings } = collapseByEmail(args.rows as ImportRowInput[]);
    const classifications = rows.map((row) => classifyRow(row, context));

    // Instantané des contacts matchés, pour calculer le diff avant→après en revue.
    const matched: Record<string, MatchedSnapshot> = {};
    for (const c of classifications) {
      if (c.kind === "enrichissement" && !(c.matchedContactId in matched)) {
        const existing = byId.get(c.matchedContactId);
        if (existing) matched[c.matchedContactId] = snapshot(existing);
      }
    }

    return { rows, classifications, collapseWarnings: warnings, matchedContacts: matched };
  },
});

type MatchedSnapshot = {
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  linkedin_url?: string;
  poste?: string;
  montant?: number;
  notes_md?: string;
  entreprise_id?: Id<"entreprises">;
};

function snapshot(c: Doc<"contacts">): MatchedSnapshot {
  return {
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    linkedin_url: c.linkedin_url,
    poste: c.poste,
    montant: c.montant,
    notes_md: c.notes_md,
    entreprise_id: c.entreprise_id,
  };
}

/** Trouve une entreprise non supprimée par nom normalisé (garde-fou anti-doublon, ADR 0001). */
async function findEntrepriseByName(
  ctx: MutationCtx,
  norm: string,
): Promise<Id<"entreprises"> | null> {
  const rows = await ctx.db
    .query("entreprises")
    .withIndex("by_nom_normalise", (q) => q.eq("nom_normalise", norm))
    .collect();
  return rows.find((e) => e.deleted_at === undefined)?._id ?? null;
}

/**
 * Commit atomique (tout-ou-rien) : re-classe les lignes de façon autoritaire,
 * applique les décisions de revue (stratégie par champ, résolutions d'Entreprise,
 * lignes refusées) puis écrit. Crée les Prospects (`nouveau`, propriétaire =
 * importateur) et enrichit les Contacts matchés (« remplir si vide », sans
 * toucher stage ni propriétaire). Renvoie un récapitulatif (cf. ADR 0002).
 */
export const commit = mutation({
  args: {
    rows: v.array(importRowValidator),
    fieldStrategies: v.optional(fieldStrategiesValidator),
    entrepriseResolutions: v.optional(v.array(entrepriseResolutionValidator)),
    rejectedIndexes: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    await requireContactWrite(ctx);
    const userId = await requireUserId(ctx);
    if (args.rows.length > MAX_IMPORT_ROWS)
      throw new ConvexError(`Fichier trop volumineux (max ${MAX_IMPORT_ROWS} lignes).`);

    const context = await loadClassifyContext(ctx);
    const { rows } = collapseByEmail(args.rows as ImportRowInput[]);
    const strategies = (args.fieldStrategies ?? {}) as FieldStrategies;
    const rejected = new Set(args.rejectedIndexes ?? []);

    // Décisions de revue indexées par nom d'Entreprise normalisé.
    const resolutionByName = new Map(
      (args.entrepriseResolutions ?? []).map((r) => [
        normalizeEntrepriseName(r.nom),
        r.action,
      ]),
    );
    // Cache des entreprises créées à la volée (idempotent sur le nom normalisé).
    const createdEntreprises = new Map<string, Id<"entreprises">>();
    const now = Date.now();

    async function resolveEntrepriseId(
      resolution:
        | { kind: "none" }
        | { kind: "matched"; entrepriseId: string }
        | { kind: "unresolved"; nom: string },
    ): Promise<Id<"entreprises"> | undefined> {
      if (resolution.kind === "none") return undefined;
      if (resolution.kind === "matched") return resolution.entrepriseId as Id<"entreprises">;
      // unresolved → décision de revue (sinon: pas de rattachement silencieux)
      const norm = normalizeEntrepriseName(resolution.nom);
      const action = resolutionByName.get(norm);
      if (!action || action.kind === "skip") return undefined;
      if (action.kind === "existing") return action.entreprise_id;
      // create (idempotent)
      const cached = createdEntreprises.get(norm);
      if (cached) return cached;
      const existing = await findEntrepriseByName(ctx, norm);
      if (existing) {
        createdEntreprises.set(norm, existing);
        return existing;
      }
      const id = await ctx.db.insert("entreprises", {
        nom: resolution.nom.trim(),
        nom_normalise: norm,
        created_by: userId,
        updated_at: now,
      });
      createdEntreprises.set(norm, id);
      return id;
    }

    let created = 0;
    let enriched = 0;
    let unchanged = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Position de départ pour les nouveaux Prospects (colonne `nouveau`).
    let nextPosition = await getMaxNouveauPosition(ctx);

    for (let i = 0; i < rows.length; i++) {
      if (rejected.has(i)) {
        skipped += 1;
        continue;
      }
      const c = classifyRow(rows[i], context);
      if (c.kind === "error") {
        errors.push(`Ligne ${i + 1} : ${c.errors.join(", ")}`);
        skipped += 1;
        continue;
      }
      const entrepriseId = await resolveEntrepriseId(c.entreprise);

      if (c.kind === "enrichissement") {
        const existing = await ctx.db.get(c.matchedContactId as Id<"contacts">);
        if (!existing || existing.deleted_at !== undefined) {
          // Le contact matché a disparu entre revue et commit → on crée.
          await insertProspect(ctx, c.values, entrepriseId, userId, nextPosition++, now);
          created += 1;
          continue;
        }
        const patch = buildEnrichmentPatch(
          {
            email: existing.email,
            telephone: existing.telephone,
            linkedin_url: existing.linkedin_url,
            poste: existing.poste,
            montant: existing.montant,
            notes_md: existing.notes_md,
            entreprise_id: existing.entreprise_id,
          },
          c.values,
          strategies,
          entrepriseId,
        );
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, {
            ...patch,
            entreprise_id: patch.entreprise_id as Id<"entreprises"> | undefined,
            updated_at: now,
          });
          enriched += 1;
        } else {
          // Doublon sans changement (« déjà à jour ») : aucune écriture, pas même
          // un `updated_at`. Compté comme ignoré, pas comme enrichi (cf. ADR 0002).
          unchanged += 1;
        }
      } else {
        await insertProspect(ctx, c.values, entrepriseId, userId, nextPosition++, now);
        created += 1;
      }
    }

    return { created, enriched, unchanged, skipped, errors };
  },
});

async function getMaxNouveauPosition(ctx: MutationCtx): Promise<number> {
  const last = await ctx.db
    .query("contacts")
    .withIndex("by_stage_and_position", (q) => q.eq("stage", "nouveau"))
    .order("desc")
    .filter((q) => q.eq(q.field("deleted_at"), undefined))
    .first();
  return last ? last.position + 1 : 0;
}

async function insertProspect(
  ctx: MutationCtx,
  values: {
    prenom: string;
    nom: string;
    email?: string;
    telephone?: string;
    linkedin_url?: string;
    poste?: string;
    montant?: number;
    notes?: string;
  },
  entrepriseId: Id<"entreprises"> | undefined,
  userId: string,
  position: number,
  now: number,
): Promise<void> {
  await ctx.db.insert("contacts", {
    prenom: values.prenom,
    nom: values.nom,
    email: values.email,
    telephone: values.telephone,
    linkedin_url: values.linkedin_url,
    poste: values.poste,
    montant: values.montant,
    notes_md: values.notes,
    entreprise_id: entrepriseId,
    owner_id: userId,
    stage: "nouveau",
    position,
    created_by: userId,
    updated_at: now,
  });
}
