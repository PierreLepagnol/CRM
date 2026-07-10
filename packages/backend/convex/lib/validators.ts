import { ConvexError, v } from "convex/values";

export const timestampMs = v.number();
export const userIdString = v.string();

// ponytail: plafond de lecture des listes (kanban/tableaux). Borne les
// `.collect()` non bornés (guideline Convex) sans introduire de pagination —
// surdimensionné pour un CRM interne. Passer à `.paginate()` si on dépasse.
export const LIST_CAP = 2000;

export function assertTimestampMs(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError(`${field} doit être un timestamp epoch milliseconds positif`);
  }
}

export function assertOptionalTimestampMs(value: number | undefined, field: string) {
  if (value !== undefined) assertTimestampMs(value, field);
}

export function assertMontant(value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError("Le montant doit être un nombre positif ou nul");
  }
}

export const contactStage = v.union(
  v.literal("nouveau"),
  v.literal("contacte"),
  v.literal("rdv"),
  v.literal("proposition"),
  v.literal("gagne"),
  v.literal("perdu"),
);

export const interactionType = v.union(
  v.literal("email"),
  v.literal("appel"),
  v.literal("rdv"),
  v.literal("linkedin"),
  v.literal("relance"),
);

export const projectType = v.union(
  v.literal("interne"),
  v.literal("mission"),
);

export const projectStatut = v.union(
  v.literal("a_demarrer"),
  v.literal("en_cours"),
  v.literal("en_revision"),
  v.literal("termine"),
);

/** Secteur d'activité d'une Entreprise (liste fermée, cf. CONTEXT.md). */
export const secteurEntreprise = v.union(
  v.literal("banque"),
  v.literal("assurance"),
  v.literal("industrie"),
  v.literal("secteur_public"),
  v.literal("services"),
  v.literal("autre"),
);

// --- Access control -------------------------------------------------------

/** Rôles applicatifs. Le rôle est stocké dans `app_users.role`. */
export const roleKey = v.union(
  v.literal("admin"),
  v.literal("commercial"),
  v.literal("lecteur"),
);

/** Clés de page stables, alignées sur les routes de l'app web. */
export const pageKey = v.union(
  v.literal("pipeline"),
  v.literal("contacts"),
  v.literal("entreprises"),
  v.literal("projets"),
  v.literal("admin"),
);

export type RoleKey = "admin" | "commercial" | "lecteur";
export type PageKey = "pipeline" | "contacts" | "entreprises" | "projets" | "admin";

/**
 * Pages autorisées par défaut pour chaque rôle. Sert de seed pour
 * `role_permissions` et de repli quand aucune ligne n'existe encore.
 */
export const DEFAULT_ROLE_PAGES: Record<RoleKey, PageKey[]> = {
  admin: ["pipeline", "contacts", "entreprises", "projets", "admin"],
  commercial: ["pipeline", "contacts", "entreprises"],
  lecteur: ["pipeline"],
};

export const DEFAULT_ROLE: RoleKey = "commercial";
