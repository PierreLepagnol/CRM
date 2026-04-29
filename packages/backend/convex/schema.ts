import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  activityKind,
  contratStatut,
  currencyCode,
  dealContactRole,
  dealStage,
  durationMinutes,
  entityRef,
  frequenceFacturation,
  jsonString,
  moneyAmount,
  nextStep,
  niveauDecision,
  probabilityPercent,
  tagScope,
  taskStatus,
  timestampMs,
  userIdString,
} from "./lib/validators";

// ---------------------------------------------------------------------------
// Schéma CRM — cf. DECISIONS.md §3
// Convention : `owner_id`, `created_by`, `actor_id` stockent l'`_id` de l'user
// renvoyé par le composant better-auth, exprimé en string (FK cross-component
// non exprimable côté schéma).
//
// Convention temporelle : les champs `date_*`, `*_at` et `updated_at` sont des
// timestamps epoch milliseconds. `_creationTime` reste la source technique de
// création Convex quand `created_at` n'est pas encore matérialisé.
//
// Tenancy : le modèle actuel est single-workspace logique. Si l'application
// devient collaborative/multi-équipe, `workspace_id` doit être ajouté à toutes
// les tables métier avant les tables de relation (`deal_contacts`,
// `entity_tags`, `tasks`).
// ---------------------------------------------------------------------------

export default defineSchema({
  // Tags
  // Grain : un libellé réutilisable pour un seul type d'entité (`scope`).
  // Relation actuelle : les entités portent un tableau `tags`. À migrer vers
  // `entity_tags` si l'assignation doit être indexée, auditée ou historisée.
  tags: defineTable({
    label: v.string(),
    couleur: v.string(), // "#RRGGBB"
    scope: tagScope,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_scope_and_label", ["scope", "label"])
    .index("by_label", ["label"]),

  // Assignations de tags
  // Grain : un tag affecté à une entité. Cette table porte la relation
  // indexée/auditable ; les tableaux `tags` sur les entités restent des caches
  // de compatibilité pour l'UI existante.
  entity_tags: defineTable({
    entity: entityRef,
    tag_id: v.id("tags"),
    assigned_by: userIdString,
    assigned_at: timestampMs,
  })
    .index("by_entity", ["entity.kind", "entity.id"])
    .index("by_tag", ["tag_id"])
    .index("by_entity_and_tag", ["entity.kind", "entity.id", "tag_id"]),

  // Sociétés
  // Grain : une fiche compte/société.
  // Relations : parent logique de contacts, deals et contrats. Suppression à
  // clarifier avant refactor : restrict ou soft-delete recommandé.
  societes: defineTable({
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
    created_by: userIdString,
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_nom", ["nom"])
    .index("by_siret", ["siret"])
    .index("by_updated_at", ["updated_at"])
    .searchIndex("search_nom", {
      searchField: "nom",
      filterFields: ["ville", "pays"],
    }),

  // Contacts
  // Grain : une personne. En v1, un contact appartient au plus à une société.
  // Si une personne peut avoir plusieurs rôles/sociétés, introduire
  // `contact_company_roles`.
  contacts: defineTable({
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
    created_by: userIdString,
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_societe", ["societe_id"])
    .index("by_email", ["email"])
    .index("by_updated_at", ["updated_at"])
    .searchIndex("search_full_name", {
      searchField: "nom",
      filterFields: ["societe_id"],
    }),

  // Deals
  // Grain : une opportunité commerciale rattachée à une société.
  // Relation actuelle : `contacts_ids` est un tableau sans métadonnées. À
  // remplacer par `deal_contacts` si les rôles, le contact principal ou
  // l'historique de relation deviennent importants.
  deals: defineTable({
    titre: v.string(),
    societe_id: v.id("societes"),
    contacts_ids: v.array(v.id("contacts")),
    montant: moneyAmount,
    devise: currencyCode,
    probabilite: probabilityPercent,
    stage: dealStage,
    date_closing_prevue: v.optional(timestampMs),
    owner_id: userIdString,
    position: v.number(),
    tags: v.array(v.id("tags")),
    notes_md: v.optional(v.string()),
    closed_at: v.optional(timestampMs),
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_stage_and_position", ["stage", "position"])
    .index("by_societe", ["societe_id"])
    .index("by_owner", ["owner_id"])
    .index("by_owner_and_stage", ["owner_id", "stage"])
    .index("by_closing", ["date_closing_prevue"])
    .index("by_updated_at", ["updated_at"])
    .searchIndex("search_titre", {
      searchField: "titre",
      filterFields: ["stage", "owner_id"],
    }),

  // Contacts par deal
  // Grain : une participation d'un contact à une opportunité, avec rôle et
  // contact principal. `deals.contacts_ids` reste un cache temporaire pour la
  // compatibilité des écrans actuels.
  deal_contacts: defineTable({
    deal_id: v.id("deals"),
    contact_id: v.id("contacts"),
    role: dealContactRole,
    is_primary: v.boolean(),
    assigned_by: userIdString,
    created_at: timestampMs,
    updated_at: timestampMs,
  })
    .index("by_deal", ["deal_id"])
    .index("by_contact", ["contact_id"])
    .index("by_deal_and_contact", ["deal_id", "contact_id"]),

  // Contrats
  // Grain : un contrat commercial. Aujourd'hui, le contrat est principalement
  // dérivé d'un deal signé. `societe_id` est une dénormalisation/snapshot à
  // documenter : elle peut diverger si le deal change de société.
  contrats: defineTable({
    deal_id: v.id("deals"),
    societe_id: v.id("societes"),
    date_signature: timestampMs,
    date_debut: timestampMs,
    date_fin: v.optional(timestampMs),
    montant_total: moneyAmount,
    devise: currencyCode,
    frequence_facturation: frequenceFacturation,
    tva: v.optional(v.number()),
    statut: contratStatut,
    created_by: v.optional(userIdString),
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_deal", ["deal_id"])
    .index("by_societe", ["societe_id"])
    .index("by_statut", ["statut"])
    .index("by_date_fin", ["date_fin"]),

  // Réunions
  // Grain : une réunion rattachée à une entité principale.
  // `participants_ids` référence les contacts présents. `next_steps` reste
  // inline en v1 ; migrer vers `tasks` si les actions doivent vivre hors du
  // compte-rendu.
  reunions: defineTable({
    attached_to: entityRef,
    date: timestampMs,
    duree_minutes: durationMinutes,
    lieu_ou_url: v.optional(v.string()),
    participants_ids: v.array(v.id("contacts")),
    compte_rendu_md: v.optional(v.string()),
    next_steps: v.array(nextStep),
    created_by: userIdString,
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_date", ["date"])
    .index("by_attached_kind_and_id_and_date", [
      "attached_to.kind",
      "attached_to.id",
      "date",
    ]),

  // Tâches
  // Grain : une action opérationnelle rattachée à une entité. Les
  // `reunions.next_steps` restent un cache de compatibilité en v1, mais les
  // tâches sont la source indexée pour la vue Aujourd'hui et le suivi.
  tasks: defineTable({
    entity: entityRef,
    source_reunion_id: v.optional(v.id("reunions")),
    source_next_step_index: v.optional(v.number()),
    title: v.string(),
    due_at: v.optional(timestampMs),
    owner_id: v.optional(userIdString),
    status: taskStatus,
    completed_at: v.optional(timestampMs),
    created_by: userIdString,
    updated_by: v.optional(userIdString),
    updated_at: timestampMs,
    deleted_at: v.optional(timestampMs),
    deleted_by: v.optional(userIdString),
  })
    .index("by_entity", ["entity.kind", "entity.id"])
    .index("by_due_status", ["status", "due_at"])
    .index("by_owner_status_due", ["owner_id", "status", "due_at"])
    .index("by_source_reunion", ["source_reunion_id"]),

  // Timeline d'activité par fiche
  // Grain : un événement append-only visible dans la timeline d'une entité.
  // `payload_json` est volontairement transitoire ; préférer des payloads typés
  // avant d'en faire une source de reporting.
  activity_events: defineTable({
    entity: entityRef,
    kind: activityKind,
    payload_json: v.optional(jsonString),
    actor_id: userIdString,
  })
    .index("by_entity", ["entity.kind", "entity.id"])
    .index("by_actor", ["actor_id"]),
});
