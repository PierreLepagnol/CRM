import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Validateurs partagés — utilisés par schema.ts ET par les mutations.
// Conventions de grain :
// - Les timestamps applicatifs sont des epoch milliseconds.
// - Les montants sont stockés en unités majeures de la devise (ex: euros).
// - Les devises doivent être des codes ISO 4217 (ex: EUR, USD).
// - Les probabilités commerciales sont des pourcentages entiers ou décimaux
//   compris entre 0 et 100.
// ---------------------------------------------------------------------------

export const timestampMs = v.number();
export const moneyAmount = v.number();
export const probabilityPercent = v.number();
export const currencyCode = v.string();
export const durationMinutes = v.number();
export const userIdString = v.string();
export const jsonString = v.string();

export function assertTimestampMs(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} doit être un timestamp epoch milliseconds positif`);
  }
}

export function assertOptionalTimestampMs(value: number | undefined, field: string) {
  if (value !== undefined) assertTimestampMs(value, field);
}

export function assertMoneyAmount(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} doit être un montant positif ou nul`);
  }
}

export function assertOptionalMoneyAmount(value: number | undefined, field: string) {
  if (value !== undefined) assertMoneyAmount(value, field);
}

export function assertOptionalNonNegativeNumber(value: number | undefined, field: string) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${field} doit être positif ou nul`);
  }
}

export function assertProbabilityPercent(value: number, field = "probabilite") {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${field} doit être compris entre 0 et 100`);
  }
}

export function assertOptionalProbabilityPercent(value: number | undefined, field = "probabilite") {
  if (value !== undefined) assertProbabilityPercent(value, field);
}

export function assertCurrencyCode(value: string, field = "devise") {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error(`${field} doit être un code devise ISO 4217 sur 3 lettres`);
  }
}

export function assertOptionalCurrencyCode(value: string | undefined, field = "devise") {
  if (value !== undefined) assertCurrencyCode(value, field);
}

export function assertDurationMinutes(value: number, field = "duree_minutes") {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} doit être une durée strictement positive en minutes`);
  }
}

export function assertOptionalDurationMinutes(value: number | undefined, field = "duree_minutes") {
  if (value !== undefined) assertDurationMinutes(value, field);
}

export const dealStage = v.union(
  v.literal("lead"),
  v.literal("qualifie"),
  v.literal("proposition"),
  v.literal("nego"),
  v.literal("signe"),
  v.literal("perdu"),
);

export const niveauDecision = v.union(
  v.literal("decideur"),
  v.literal("prescripteur"),
  v.literal("utilisateur"),
);

export const frequenceFacturation = v.union(
  v.literal("mensuel"),
  v.literal("trimestriel"),
  v.literal("annuel"),
  v.literal("unique"),
);

export const contratStatut = v.union(
  v.literal("actif"),
  v.literal("en_pause"),
  v.literal("termine"),
  v.literal("resilie"),
);

export const taskStatus = v.union(
  v.literal("open"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const tagScope = v.union(
  v.literal("societe"),
  v.literal("contact"),
  v.literal("deal"),
);

export const dealContactRole = v.union(
  v.literal("primary"),
  v.literal("decision_maker"),
  v.literal("influencer"),
  v.literal("technical"),
  v.literal("legal"),
  v.literal("billing"),
  v.literal("participant"),
);

export const entityRef = v.union(
  v.object({ kind: v.literal("societe"), id: v.id("societes") }),
  v.object({ kind: v.literal("contact"), id: v.id("contacts") }),
  v.object({ kind: v.literal("deal"), id: v.id("deals") }),
);

export const activityKind = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("stage_changed"),
  v.literal("meeting_logged"),
  v.literal("note_added"),
  v.literal("merged"),
);

// Next-step inline (réunions)
export const nextStep = v.object({
  description: v.string(),
  due_date: v.optional(timestampMs),
  owner_id: v.optional(userIdString),
  done: v.boolean(),
});
