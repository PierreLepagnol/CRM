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
