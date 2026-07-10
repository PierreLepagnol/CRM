import { internalAction, internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pickBackfillOwner } from "./lib/accessLogic";
import { normalizeEntrepriseName } from "./lib/entrepriseLogic";

// Utilisateur par défaut pour les contacts orphelins que le rapprochement par
// nom ne résout pas (décision : nettoyage ponctuel, voir CONTEXT.md).
const DEFAULT_OWNER_EMAIL = "pierre.lepagnol@sciam.fr";

// Run once from the Convex dashboard to purge all credential (email/password)
// accounts and orphaned users that have no Microsoft SSO account.
export const cleanNonMicrosoftAuth = internalAction({
  args: {},
  handler: async (ctx) => {
    const { page: credentialAccounts } = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "account",
        where: [{ field: "providerId", value: "credential" }],
        paginationOpts: { numItems: 1000, cursor: null },
      },
    );

    let deletedAccounts = 0;
    let deletedUsers = 0;
    let deletedSessions = 0;

    for (const account of credentialAccounts) {
      const microsoftAccount = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "account",
          where: [
            { field: "userId", value: account.userId },
            { field: "providerId", value: "microsoft" },
          ],
        },
      );

      if (!microsoftAccount) {
        const { page: sessions } = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "session",
            where: [{ field: "userId", value: account.userId }],
            paginationOpts: { numItems: 1000, cursor: null },
          },
        );

        for (const session of sessions) {
          await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
            input: { model: "session", where: [{ field: "_id", value: session._id }] },
          });
          deletedSessions++;
        }

        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: { model: "user", where: [{ field: "_id", value: account.userId }] },
        });
        deletedUsers++;
      }

      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: { model: "account", where: [{ field: "_id", value: account._id }] },
      });
      deletedAccounts++;
    }

    console.log({ deletedAccounts, deletedUsers, deletedSessions });
    return { deletedAccounts, deletedUsers, deletedSessions };
  },
});

// One-shot backfill: give every owner-less contact a propriétaire. First try to
// map the legacy free-text contact_sciam to a known SSO user (accent/case-
// insensitive, first-name/prefix fallback — see matchOwnerByName); any contact
// still unresolved is assigned to the default owner (DEFAULT_OWNER_EMAIL) so no
// contact is left orphaned. Contacts that already have an owner are untouched.
// Run once after deploy:
//   npx convex run migrations:backfillContactOwners
export const backfillContactOwners = internalMutation({
  args: {},
  handler: async (ctx) => {
    const appUsers = await ctx.db.query("app_users").collect();
    const users = appUsers.map((u) => ({ user_id: u.user_id, name: u.name }));

    const defaultOwner = appUsers.find(
      (u) => u.email.toLowerCase() === DEFAULT_OWNER_EMAIL,
    );
    if (!defaultOwner) {
      throw new Error(
        `Utilisateur par défaut introuvable (${DEFAULT_OWNER_EMAIL}). Aucun rattrapage effectué.`,
      );
    }

    const contacts = await ctx.db.query("contacts").collect();
    let matched = 0;
    let defaulted = 0;

    for (const c of contacts) {
      if (c.deleted_at !== undefined || c.owner_id) continue;
      const ownerId = pickBackfillOwner({
        contactSciam: c.contact_sciam,
        users,
        defaultUserId: defaultOwner.user_id,
      });
      await ctx.db.patch(c._id, { owner_id: ownerId, updated_at: Date.now() });
      if (ownerId === defaultOwner.user_id) defaulted++;
      else matched++;
    }

    return { matched, defaulted };
  },
});

// One-shot backfill: convertit le champ texte legacy `contacts.entreprise` en
// entité Entreprise. Pour chaque nom normalisé distinct (trim/casse/accents),
// crée UNE entreprise (en gardant la première orthographe rencontrée comme nom
// affiché) et renseigne `entreprise_id` sur les contacts concernés. Pas de
// fusion floue : « Crédit Agricole » et « Crédit Agricole CIB » restent
// distincts (cf. ADR 0001). Les contacts supprimés ou déjà rattachés sont
// ignorés. Idempotent : réutilise une entreprise existante de même nom normalisé.
// Run once after deploy:
//   npx convex run migrations:backfillEntreprises
export const backfillEntreprises = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("entreprises").collect();
    const byNorm = new Map<string, Id<"entreprises">>();
    for (const e of existing) {
      if (e.deleted_at === undefined) byNorm.set(e.nom_normalise, e._id);
    }

    const contacts = await ctx.db.query("contacts").collect();
    let created = 0;
    let linked = 0;

    for (const c of contacts) {
      if (c.deleted_at !== undefined || c.entreprise_id) continue;
      const raw = c.entreprise?.trim();
      if (!raw) continue;
      const norm = normalizeEntrepriseName(raw);
      if (!norm) continue;

      let entrepriseId = byNorm.get(norm);
      let nom = raw;
      if (!entrepriseId) {
        entrepriseId = await ctx.db.insert("entreprises", {
          nom: raw,
          nom_normalise: norm,
          created_by: c.created_by,
          updated_at: Date.now(),
        });
        byNorm.set(norm, entrepriseId);
        created++;
      } else {
        nom = (await ctx.db.get(entrepriseId))?.nom ?? raw;
      }
      await ctx.db.patch(c._id, {
        entreprise_id: entrepriseId,
        entreprise_nom: nom,
        updated_at: Date.now(),
      });
      linked++;
    }

    return { created, linked };
  },
});

// One-shot backfill: renseigne le nom d'Entreprise dénormalisé (`entreprise_nom`,
// indexé pour la recherche) sur les contacts déjà rattachés par `entreprise_id`
// mais dépourvus du champ (rattachés avant l'ajout de la dénormalisation).
// Idempotent. Run once after deploy:
//   npx convex run migrations:backfillEntrepriseNom
export const backfillEntrepriseNom = internalMutation({
  args: {},
  handler: async (ctx) => {
    const entreprises = await ctx.db.query("entreprises").collect();
    const nomById = new Map<Id<"entreprises">, string>();
    for (const e of entreprises) {
      if (e.deleted_at === undefined) nomById.set(e._id, e.nom);
    }

    const contacts = await ctx.db.query("contacts").collect();
    let updated = 0;
    for (const c of contacts) {
      if (c.deleted_at !== undefined || !c.entreprise_id) continue;
      const nom = nomById.get(c.entreprise_id);
      if (nom !== undefined && c.entreprise_nom !== nom) {
        await ctx.db.patch(c._id, { entreprise_nom: nom, updated_at: Date.now() });
        updated++;
      }
    }
    return { updated };
  },
});
