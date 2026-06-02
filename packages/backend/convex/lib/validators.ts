import { v } from "convex/values";

export const timestampMs = v.number();
export const userIdString = v.string();

export function assertTimestampMs(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} doit être un timestamp epoch milliseconds positif`);
  }
}

export function assertOptionalTimestampMs(value: number | undefined, field: string) {
  if (value !== undefined) assertTimestampMs(value, field);
}

export function assertMontant(value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Le montant doit être un nombre positif ou nul");
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
  v.literal("projets"),
  v.literal("admin"),
);

export type RoleKey = "admin" | "commercial" | "lecteur";
export type PageKey = "pipeline" | "contacts" | "projets" | "admin";

export const ALL_ROLES: RoleKey[] = ["admin", "commercial", "lecteur"];
export const ALL_PAGES: PageKey[] = ["pipeline", "contacts", "projets", "admin"];

/**
 * Pages autorisées par défaut pour chaque rôle. Sert de seed pour
 * `role_permissions` et de repli quand aucune ligne n'existe encore.
 */
export const DEFAULT_ROLE_PAGES: Record<RoleKey, PageKey[]> = {
  admin: ["pipeline", "contacts", "projets", "admin"],
  commercial: ["pipeline", "contacts"],
  lecteur: ["pipeline"],
};

export const DEFAULT_ROLE: RoleKey = "commercial";
