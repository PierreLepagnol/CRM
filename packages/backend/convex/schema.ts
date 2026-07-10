import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  contactStage,
  interactionType,
  pageKey,
  projectStatut,
  projectType,
  roleKey,
  secteurEntreprise,
  timestampMs,
  userIdString,
} from "./lib/validators";

export default defineSchema({
  // Miroir applicatif des utilisateurs SSO (better-auth gère sa propre table
  // en interne). Alimenté par les triggers better-auth, porte le rôle.
  app_users: defineTable({
    user_id: userIdString, // better-auth user._id (lien canonique)
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    role: roleKey,
    updated_at: timestampMs,
  })
    .index("by_user_id", ["user_id"])
    .index("by_email", ["email"]),

  // Pages autorisées par rôle, éditable depuis l'admin.
  role_permissions: defineTable({
    role: roleKey,
    pages: v.array(pageKey),
    updated_at: timestampMs,
  }).index("by_role", ["role"]),

  // Organisations (« comptes ») auxquelles des contacts sont rattachés.
  // Entité de premier ordre — cf. docs/adr/0001-entreprise-entite-premier-ordre.md.
  entreprises: defineTable({
    nom: v.string(),
    // Nom normalisé (casse/accents/espaces) pour le garde-fou anti-doublon et
    // la recherche exacte. Cf. lib/entrepriseLogic.normalizeEntrepriseName.
    nom_normalise: v.string(),
    secteur: v.optional(secteurEntreprise),
    site_web: v.optional(v.string()),
    notes_md: v.optional(v.string()),
    created_by: userIdString,
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
  })
    .index("by_active_nom_normalise", ["deleted_at", "nom_normalise"])
    .index("by_active_updated", ["deleted_at", "updated_at"])
    .searchIndex("search_nom", { searchField: "nom" }),

  contacts: defineTable({
    prenom: v.string(),
    nom: v.string(),
    entreprise: v.optional(v.string()), // legacy: texte libre, remplacé par entreprise_id
    entreprise_id: v.optional(v.id("entreprises")),
    // Nom de l'Entreprise liée, dénormalisé pour la recherche plein-texte (les
    // contacts migrés n'ont que `entreprise_id`). Synchronisé sur chaque
    // écriture qui touche `entreprise_id` et sur le renommage d'entreprise.
    entreprise_nom: v.optional(v.string()),
    montant: v.optional(v.number()),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
    linkedin_url: v.optional(v.string()), // coordonnée: URL du profil LinkedIn (cf. CONTEXT.md)
    poste: v.optional(v.string()),
    contact_sciam: v.optional(v.string()), // legacy: texte libre, remplacé par owner_id
    owner_id: v.optional(userIdString), // propriétaire (app_users.user_id)
    responsible_ids: v.optional(v.array(userIdString)), // responsables additionnels
    notes_md: v.optional(v.string()),
    stage: contactStage,
    next_relance_at: v.optional(timestampMs),
    position: v.number(),
    created_by: userIdString,
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
  })
    // Index « actifs » : `deleted_at` en tête (undefined = non supprimé) pour
    // exclure les contacts supprimés AU NIVEAU DE L'INDEX (plus de filtre JS ni
    // de budget `.take()` gaspillé). Cf. audit #16 / guideline soft-delete.
    .index("by_active_stage_position", ["deleted_at", "stage", "position"])
    .index("by_active_updated", ["deleted_at", "updated_at"])
    .index("by_active_next_relance", ["deleted_at", "next_relance_at"])
    .index("by_active_entreprise", ["deleted_at", "entreprise_id"])
    .searchIndex("search_nom", { searchField: "nom", filterFields: ["stage"] })
    .searchIndex("search_prenom", { searchField: "prenom" })
    .searchIndex("search_entreprise", { searchField: "entreprise_nom" }),

  interactions: defineTable({
    contact_id: v.id("contacts"),
    type: interactionType,
    date_at: timestampMs,
    resume: v.string(),
    created_by: userIdString,
  })
    .index("by_contact_and_date", ["contact_id", "date_at"]),

  projects: defineTable({
    titre: v.string(),
    type: projectType,
    client: v.optional(v.string()),
    montant: v.optional(v.number()),
    statut: projectStatut,
    description_md: v.optional(v.string()),
    date_debut: v.optional(timestampMs),
    date_fin_prevue: v.optional(timestampMs),
    contact_id: v.optional(v.id("contacts")),
    position: v.number(),
    created_by: userIdString,
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
  })
    .index("by_active_statut_position", ["deleted_at", "statut", "position"])
    .index("by_active_updated", ["deleted_at", "updated_at"]),
});
