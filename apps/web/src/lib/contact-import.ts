import type { ImportRowInput } from "@CRM-APP/backend/convex/lib/importLogic";

/**
 * Logique pure du mapping d'import (parsing/UI à part) : reconnaissance des
 * en-têtes et projection des lignes parsées vers le format attendu par la query
 * de classement. Cf. docs/adr/0002-import-contacts-dedup-et-fusion.md.
 */

/** Champs mappables v1 (cf. ADR 0002). prénom/nom sont requis. */
export const IMPORT_FIELDS = [
  { key: "prenom", label: "Prénom", required: true },
  { key: "nom", label: "Nom", required: true },
  { key: "email", label: "Email" },
  { key: "telephone", label: "Téléphone" },
  { key: "linkedin_url", label: "Profil LinkedIn" },
  { key: "poste", label: "Poste" },
  { key: "entreprise", label: "Entreprise" },
  { key: "montant", label: "Montant" },
  { key: "notes", label: "Notes" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Stratégies de fusion proposées en revue (cf. ADR 0002). */
export const MERGE_STRATEGY_ITEMS = [
  { value: "fill_if_empty", label: "Remplir si vide" },
  { value: "overwrite", label: "L'import écrase" },
  { value: "ignore", label: "Ne pas toucher" },
] as const;

/** Champs dont la stratégie d'enrichissement est surchargeable pour tout le lot. */
export const ENRICHMENT_FIELDS = [
  { key: "email", label: "Email" },
  { key: "telephone", label: "Téléphone" },
  { key: "linkedin_url", label: "Profil LinkedIn" },
  { key: "poste", label: "Poste" },
  { key: "montant", label: "Montant" },
  { key: "entreprise", label: "Entreprise" },
  { key: "notes", label: "Notes" },
] as const;

/** Synonymes d'en-têtes normalisés. L'export FR est l'inverse naturel (cf. contact-export). */
const SYNONYMS: Record<ImportFieldKey, string[]> = {
  prenom: ["prenom", "first name", "firstname"],
  nom: ["nom", "last name", "lastname", "nom de famille", "name"],
  email: ["email", "e-mail", "courriel", "mail", "adresse email", "adresse e-mail"],
  telephone: ["telephone", "tel", "phone", "mobile", "portable", "numero", "tel."],
  linkedin_url: ["profil linkedin", "linkedin", "linkedin url", "url linkedin", "lien linkedin"],
  poste: ["poste", "fonction", "title", "job title", "intitule", "titre"],
  entreprise: ["entreprise", "societe", "company", "organisation", "compte", "raison sociale"],
  montant: ["montant", "amount", "budget", "valeur", "ca", "montant (eur)", "montant eur"],
  notes: ["notes", "note", "commentaire", "commentaires", "remarques", "remarque"],
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Devine la correspondance en-tête → champ par égalité normalisée (casse,
 * accents, espaces ignorés). Un champ n'est attribué qu'une fois (première
 * colonne gagnante). Les en-têtes inconnus restent non mappés (`""`).
 */
export function autoDetectMapping(headers: string[]): Record<string, ImportFieldKey | ""> {
  const used = new Set<ImportFieldKey>();
  const result: Record<string, ImportFieldKey | ""> = {};
  for (const header of headers) {
    const h = norm(header);
    let found: ImportFieldKey | "" = "";
    for (const { key } of IMPORT_FIELDS) {
      if (used.has(key)) continue;
      if (SYNONYMS[key].includes(h)) {
        found = key;
        break;
      }
    }
    result[header] = found;
    if (found) used.add(found);
  }
  return result;
}

/**
 * Projette les lignes parsées (clé = en-tête) vers `ImportRowInput` (clé = champ),
 * en ne retenant que les colonnes mappées. Les valeurs vides sont conservées en
 * chaîne — la query/le commit tranchent (vide email = Création, etc.).
 */
export function mapRowsToImportInput(
  rows: Record<string, unknown>[],
  mapping: Record<string, ImportFieldKey | "">,
): ImportRowInput[] {
  const headerForField = new Map<ImportFieldKey, string>();
  for (const [header, key] of Object.entries(mapping)) {
    if (key && !headerForField.has(key)) headerForField.set(key, header);
  }
  return rows.map((row) => {
    const out: ImportRowInput = {};
    for (const { key } of IMPORT_FIELDS) {
      const header = headerForField.get(key);
      if (header === undefined) continue;
      const val = row[header];
      if (val !== undefined && val !== null) out[key] = String(val);
    }
    return out;
  });
}
