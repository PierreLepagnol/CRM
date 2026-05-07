import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  contactStage,
  interactionType,
  projectStatut,
  projectType,
  timestampMs,
  userIdString,
} from "./lib/validators";

export default defineSchema({
  contacts: defineTable({
    prenom: v.string(),
    nom: v.string(),
    entreprise: v.optional(v.string()),
    montant: v.optional(v.number()),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
    poste: v.optional(v.string()),
    contact_sciam: v.optional(v.string()),
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
