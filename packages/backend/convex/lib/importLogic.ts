/**
 * Logique de domaine pure pour l'Import de contacts (sans dépendance Convex /
 * better-auth), donc testable directement. Les fonctions Convex (`contactImport.ts`)
 * en sont de fines adaptations. Voir CONTEXT.md (Import, Doublon, Enrichissement)
 * et docs/adr/0002-import-contacts-dedup-et-fusion.md.
 */

import { normalizeEntrepriseName, resolveMergedNotes } from "./entrepriseLogic";

/**
 * Une ligne d'import après mapping des colonnes : les champs mappables v1,
 * encore sous forme de texte brut (le `montant` est parsé plus tard).
 */
export type ImportRowInput = {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  linkedin_url?: string;
  poste?: string;
  entreprise?: string;
  montant?: string;
  notes?: string;
};

/** Champs scalaires fusionnés « remplir si vide » (notes/email à part). */
const SCALAR_FIELDS = [
  "prenom",
  "nom",
  "telephone",
  "linkedin_url",
  "poste",
  "entreprise",
  "montant",
] as const;

/**
 * Normalise un email pour le dédoublonnage : minuscules + trim. C'est l'UNIQUE
 * critère de doublon (cf. ADR 0002) — aucun rapprochement par nom. Une chaîne
 * vide renvoie `undefined` : une ligne sans email n'est jamais un doublon.
 */
export function normalizeEmail(raw: string | undefined): string | undefined {
  const trimmed = (raw ?? "").trim().toLowerCase();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Stratégie de fusion par champ, surchargeable pour tout le lot en revue
 * (cf. ADR 0002). Défaut : `fill_if_empty`.
 *  - `fill_if_empty` : ne remplit que si l'existant est vide (jamais d'écrasement).
 *  - `overwrite` : « l'import fait foi » — écrase, sauf si l'import est vide.
 *  - `ignore` : ne touche jamais le champ existant.
 */
export type MergeStrategy = "fill_if_empty" | "overwrite" | "ignore";

const isBlank = (s: string | undefined): boolean => (s ?? "").trim() === "";

/**
 * Résout la valeur d'un champ scalaire lors d'un Enrichissement. Une valeur
 * vide (vide/espaces) n'écrase jamais une valeur existante, quelle que soit la
 * stratégie. Les notes sont un cas à part (concaténation via resolveMergedNotes).
 */
export function resolveFieldMerge(
  strategy: MergeStrategy,
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  if (strategy === "ignore") return existing;
  if (strategy === "overwrite") return isBlank(incoming) ? existing : incoming;
  // fill_if_empty
  return isBlank(existing) ? incoming : existing;
}

/** Fusionne `incoming` dans `base` : scalaires « remplir si vide », notes concaténées. */
function mergeRowFillIfEmpty(base: ImportRowInput, incoming: ImportRowInput): ImportRowInput {
  const merged: ImportRowInput = { ...base };
  for (const f of SCALAR_FIELDS) {
    merged[f] = resolveFieldMerge("fill_if_empty", base[f], incoming[f]);
  }
  merged.notes = resolveMergedNotes(base.notes, incoming.notes);
  return merged;
}

export type CollapseWarning = { email: string; mergedCount: number };

/**
 * Fusionne les lignes de même email normalisé AVANT la revue (doublon
 * intra-fichier, cf. ADR 0002) : la première l'emporte, les champs vides sont
 * comblés par les suivantes (« remplir si vide »), les notes se concatènent. Les
 * lignes sans email ne fusionnent jamais. Chaque groupe fusionné lève un
 * avertissement.
 */
export function collapseByEmail(rows: ImportRowInput[]): {
  rows: ImportRowInput[];
  warnings: CollapseWarning[];
} {
  const slots: ImportRowInput[] = [];
  const counts: number[] = [];
  const emails: (string | undefined)[] = [];
  const indexByEmail = new Map<string, number>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const existing = email !== undefined ? indexByEmail.get(email) : undefined;
    if (existing !== undefined) {
      slots[existing] = mergeRowFillIfEmpty(slots[existing], row);
      counts[existing] += 1;
    } else {
      const i = slots.length;
      slots.push({ ...row });
      counts.push(1);
      emails.push(email);
      if (email !== undefined) indexByEmail.set(email, i);
    }
  }

  const warnings: CollapseWarning[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (counts[i] > 1 && emails[i] !== undefined) {
      warnings.push({ email: emails[i] as string, mergedCount: counts[i] });
    }
  }
  return { rows: slots, warnings };
}

export type ParseMontantResult =
  | { ok: true; value: number | undefined }
  | { ok: false; error: string };

const MONTANT_ERROR = "Le montant doit être un nombre positif ou nul";

/**
 * Nettoie un montant saisi au format français avant validation : espaces (y
 * compris insécables), symbole €, et virgule décimale → point. Une cellule vide
 * est acceptée (montant optionnel → `undefined`). Toute valeur non-parsable ou
 * négative est une erreur bloquante (cf. ADR 0002).
 */
export function parseMontant(raw: string | undefined): ParseMontantResult {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { ok: true, value: undefined };
  const cleaned = trimmed
    .replace(/[\s  ]/g, "")
    .replace(/€/g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: MONTANT_ERROR };
  return { ok: true, value };
}

// --- Classification d'une ligne d'import ----------------------------------

const clean = (s: string | undefined): string | undefined => {
  const t = (s ?? "").trim();
  return t === "" ? undefined : t;
};

/**
 * Index de rapprochement préchargé depuis la base : email normalisé → contact
 * existant (dédoublonnage), nom normalisé → entreprise existante (rattachement
 * exact). Un même email/nom n'indexe que sa première occurrence.
 */
export type ClassifyContext = {
  contactIdByEmail: Map<string, string>;
  entrepriseIdByName: Map<string, string>;
};

export function buildClassifyContext(input: {
  contacts: { id: string; email?: string }[];
  entreprises: { id: string; nom: string }[];
}): ClassifyContext {
  const contactIdByEmail = new Map<string, string>();
  for (const c of input.contacts) {
    const e = normalizeEmail(c.email);
    if (e !== undefined && !contactIdByEmail.has(e)) contactIdByEmail.set(e, c.id);
  }
  const entrepriseIdByName = new Map<string, string>();
  for (const e of input.entreprises) {
    const n = normalizeEntrepriseName(e.nom);
    if (n !== "" && !entrepriseIdByName.has(n)) entrepriseIdByName.set(n, e.id);
  }
  return { contactIdByEmail, entrepriseIdByName };
}

/**
 * Rattachement d'Entreprise (cf. ADR 0002) : `none` si la ligne n'en porte pas,
 * `matched` si le nom normalisé correspond exactement à une Entreprise existante,
 * `unresolved` si le nom est distinct (l'importateur tranche en revue — jamais
 * de création silencieuse, respect d'ADR 0001).
 */
export type EntrepriseResolution =
  | { kind: "none" }
  | { kind: "matched"; entrepriseId: string }
  | { kind: "unresolved"; nom: string };

function resolveEntreprise(
  raw: string | undefined,
  ctx: ClassifyContext,
): EntrepriseResolution {
  const nom = (raw ?? "").trim();
  if (nom === "") return { kind: "none" };
  const matched = ctx.entrepriseIdByName.get(normalizeEntrepriseName(nom));
  return matched !== undefined
    ? { kind: "matched", entrepriseId: matched }
    : { kind: "unresolved", nom };
}

/** Valeurs nettoyées d'une ligne classée, prêtes pour la création/l'enrichissement. */
export type ClassifiedValues = {
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  linkedin_url?: string;
  poste?: string;
  montant?: number;
  notes?: string;
};

/**
 * Classement d'une ligne (cf. ADR 0002) :
 *  - `error` : ligne bloquante (prénom/nom manquant ou montant invalide).
 *  - `creation` : aucun email ou email inconnu → nouveau Prospect.
 *  - `enrichissement` : email normalisé correspondant à un Contact existant.
 */
export type RowClassification =
  | { kind: "error"; errors: string[] }
  | { kind: "creation"; values: ClassifiedValues; entreprise: EntrepriseResolution }
  | {
      kind: "enrichissement";
      matchedContactId: string;
      values: ClassifiedValues;
      entreprise: EntrepriseResolution;
    };

export function classifyRow(
  row: ImportRowInput,
  ctx: ClassifyContext,
): RowClassification {
  const errors: string[] = [];
  const prenom = clean(row.prenom);
  const nom = clean(row.nom);
  if (prenom === undefined) errors.push("Le prénom est requis");
  if (nom === undefined) errors.push("Le nom est requis");
  const montant = parseMontant(row.montant);
  if (!montant.ok) errors.push(montant.error);
  if (errors.length > 0) return { kind: "error", errors };

  const email = normalizeEmail(row.email);
  const values: ClassifiedValues = {
    prenom: prenom as string,
    nom: nom as string,
    email,
    telephone: clean(row.telephone),
    linkedin_url: clean(row.linkedin_url),
    poste: clean(row.poste),
    montant: montant.ok ? montant.value : undefined,
    notes: clean(row.notes),
  };
  const entreprise = resolveEntreprise(row.entreprise, ctx);
  const matchedContactId =
    email !== undefined ? ctx.contactIdByEmail.get(email) : undefined;
  if (matchedContactId !== undefined) {
    return { kind: "enrichissement", matchedContactId, values, entreprise };
  }
  return { kind: "creation", values, entreprise };
}

// --- Enrichissement : patch « remplir si vide » d'un Contact existant ------

/** Sous-ensemble fusionnable d'un Contact existant (noms de champs DB). */
export type ContactMergeInput = {
  email?: string;
  telephone?: string;
  linkedin_url?: string;
  poste?: string;
  montant?: number;
  notes_md?: string;
  entreprise_id?: string;
};

/** Champ surchargeable en revue (par champ, pour tout le lot — cf. ADR 0002). */
export type EnrichmentStrategyField =
  | "email"
  | "telephone"
  | "linkedin_url"
  | "poste"
  | "montant"
  | "entreprise"
  | "notes";
export type FieldStrategies = Partial<Record<EnrichmentStrategyField, MergeStrategy>>;

const STRING_FIELDS: {
  field: "email" | "telephone" | "linkedin_url" | "poste";
  strat: EnrichmentStrategyField;
}[] = [
  { field: "email", strat: "email" },
  { field: "telephone", strat: "telephone" },
  { field: "linkedin_url", strat: "linkedin_url" },
  { field: "poste", strat: "poste" },
];

function mergeOptional<T>(
  strategy: MergeStrategy,
  existing: T | undefined,
  incoming: T | undefined,
): T | undefined {
  if (strategy === "ignore") return existing;
  if (strategy === "overwrite") return incoming ?? existing;
  return existing ?? incoming; // fill_if_empty
}

/**
 * Construit le patch d'un Enrichissement : « remplir si vide » par défaut (jamais
 * d'écrasement), surchargeable par champ. Les notes sont concaténées (réutilise
 * resolveMergedNotes). Le `stage` et le `owner_id` ne sont JAMAIS dans le patch
 * (conservés tels quels — cf. ADR 0002). Seuls les champs réellement modifiés
 * sont retournés. `resolvedEntrepriseId` est l'Entreprise rattachée (match exact
 * ou choix de revue).
 */
export function buildEnrichmentPatch(
  existing: ContactMergeInput,
  incoming: ClassifiedValues,
  strategies: FieldStrategies,
  resolvedEntrepriseId: string | undefined,
): Partial<ContactMergeInput> {
  const patch: Partial<ContactMergeInput> = {};
  const stratOf = (f: EnrichmentStrategyField): MergeStrategy =>
    strategies[f] ?? "fill_if_empty";

  for (const { field, strat } of STRING_FIELDS) {
    const resolved = resolveFieldMerge(stratOf(strat), existing[field], incoming[field]);
    if (resolved !== existing[field] && resolved !== undefined) patch[field] = resolved;
  }

  const montant = mergeOptional(stratOf("montant"), existing.montant, incoming.montant);
  if (montant !== existing.montant && montant !== undefined) patch.montant = montant;

  const entrepriseId = mergeOptional(
    stratOf("entreprise"),
    existing.entreprise_id,
    resolvedEntrepriseId,
  );
  if (entrepriseId !== existing.entreprise_id && entrepriseId !== undefined)
    patch.entreprise_id = entrepriseId;

  const notesStrat = stratOf("notes");
  let notes: string | undefined;
  if (notesStrat === "ignore") notes = existing.notes_md;
  else if (notesStrat === "overwrite")
    notes = isBlank(incoming.notes) ? existing.notes_md : incoming.notes;
  else if ((existing.notes_md ?? "").trim() === (incoming.notes ?? "").trim())
    // Notes entrantes identiques (au trim près) à celles stockées : on ne
    // ré-concatène pas, pour qu'un ré-import du même fichier reste un no-op
    // (sans cela `resolveMergedNotes` produirait « note\n\nnote »). Cf. ADR 0002.
    notes = existing.notes_md;
  else notes = resolveMergedNotes(existing.notes_md, incoming.notes); // concat par défaut
  if (notes !== existing.notes_md && notes !== undefined) patch.notes_md = notes;

  return patch;
}
