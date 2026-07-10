import { ConvexError } from "convex/values";

/**
 * Logique de domaine pure pour les Entreprises (sans dépendance Convex /
 * better-auth), donc testable directement. Les fonctions Convex (`entreprises.ts`,
 * `migrations.ts`) en sont de fines adaptations. Voir CONTEXT.md (Entreprise,
 * Fusion) et docs/adr/0001-entreprise-entite-premier-ordre.md.
 */

/**
 * Normalise une raison sociale pour comparaison exacte : minuscules, sans
 * accents, espaces collapsés. "  Crédit  Agricole " → "credit agricole".
 * On NE fait PAS de rapprochement flou : « Crédit Agricole » et « Crédit
 * Agricole CIB » restent distincts (cf. ADR 0001).
 */
export function normalizeEntrepriseName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Notes résultant d'une fusion : celles du survivant d'abord, puis celles de
 * l'absorbée à la suite (rien n'est perdu, cf. ADR 0001). Renvoie `undefined`
 * si aucune des deux n'a de notes (pour effacer/ne pas écrire le champ).
 */
export function resolveMergedNotes(
  survivorNotes: string | undefined,
  absorbedNotes: string | undefined,
): string | undefined {
  const parts = [survivorNotes, absorbedNotes].filter(
    (n): n is string => Boolean(n && n.trim()),
  );
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Vrai si `name` commence par la saisie `query` (comparaison normalisée :
 * casse/accents/espaces ignorés). C'est le « commence par » de l'autocomplétion
 * du formulaire contact : taper « Crédit Agricole » propose « Crédit Agricole
 * CIB ». Une saisie vide ne matche rien.
 */
export function matchesPrefix(query: string, name: string): boolean {
  const q = normalizeEntrepriseName(query);
  if (!q) return false;
  return normalizeEntrepriseName(name).startsWith(q);
}

/** Message d'erreur quand on tente de supprimer une entreprise non vide. */
export const ENTREPRISE_HAS_CONTACTS_ERROR =
  "Impossible de supprimer une entreprise tant que des contacts y sont rattachés. Détachez, déplacez ou fusionnez-les d'abord.";

/**
 * Garantit qu'une Entreprise est supprimable : refusé tant qu'au moins un
 * Contact y est rattaché (la fusion est la voie normale de consolidation, cf.
 * ADR 0001).
 */
export function assertEntrepriseDeletable(attachedContactCount: number): void {
  if (attachedContactCount > 0) {
    throw new ConvexError(ENTREPRISE_HAS_CONTACTS_ERROR);
  }
}
