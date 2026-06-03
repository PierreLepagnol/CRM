import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  contactStage,
  interactionType,
  pageKey,
  projectStatut,
  projectType,
  roleKey,
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

  contacts: defineTable({
    prenom: v.string(),
    nom: v.string(),
    entreprise: v.optional(v.string()),
    montant: v.optional(v.number()),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
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
    .index("by_stage_and_position", ["stage", "position"])
    .index("by_updated_at", ["updated_at"])
    .index("by_next_relance_at", ["next_relance_at"])
    .searchIndex("search_nom", { searchField: "nom", filterFields: ["stage"] })
    .searchIndex("search_prenom", { searchField: "prenom" })
    .searchIndex("search_entreprise", { searchField: "entreprise" }),

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
    .index("by_statut_and_position", ["statut", "position"])
    .index("by_updated_at", ["updated_at"]),
});
