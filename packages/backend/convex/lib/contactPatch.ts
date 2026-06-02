/**
 * Champs « effaçables » d'un contact : le client envoie `null` pour effacer
 * (car `undefined` est supprimé lors de la sérialisation JSON), et le serveur
 * convertit `null` → `undefined`, ce qui supprime le champ via `ctx.db.patch`.
 */
const CLEARABLE_FIELDS = ["owner_id", "next_relance_at"] as const;
type ClearableField = (typeof CLEARABLE_FIELDS)[number];

/** Le `null` des champs effaçables devient `undefined` (suppression du champ). */
type Cleared<T> = {
  [K in keyof T]: K extends ClearableField ? Exclude<T[K], null> : T[K];
};

export function toClearableDbPatch<T extends Record<string, unknown>>(
  patch: T,
): Cleared<T> {
  const result = { ...patch };
  for (const field of CLEARABLE_FIELDS) {
    if (field in result && result[field] === null) {
      (result as Record<string, unknown>)[field] = undefined;
    }
  }
  return result as Cleared<T>;
}
