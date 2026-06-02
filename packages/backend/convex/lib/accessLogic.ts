import {
  DEFAULT_ROLE_PAGES,
  type PageKey,
  type RoleKey,
} from "./validators";

/**
 * Logique d'autorisation pure (sans dépendance Convex / better-auth), pour être
 * testable directement. Les fonctions Convex (`access.ts`, `users.ts`) en sont
 * de fines adaptations.
 */

/** Rôle par défaut quand l'utilisateur n'a pas (encore) de ligne `app_users`. */
export const FALLBACK_ROLE: RoleKey = "lecteur";

/** Rôle effectif : fail-closed sur le rôle le moins privilégié si absent. */
export function resolveRole(role: RoleKey | undefined | null): RoleKey {
  return role ?? FALLBACK_ROLE;
}

export type RolePermissionRow = { role: RoleKey; pages: PageKey[] };

/** Pages autorisées pour un rôle : ligne stockée, sinon valeurs par défaut. */
export function allowedPagesFromRows(
  role: RoleKey,
  rows: RolePermissionRow[],
): PageKey[] {
  const row = rows.find((r) => r.role === role);
  return row ? row.pages : DEFAULT_ROLE_PAGES[role];
}

/** Le rôle a-t-il accès à la page donnée ? */
export function canAccessPage(
  role: RoleKey,
  page: PageKey,
  rows: RolePermissionRow[],
): boolean {
  return allowedPagesFromRows(role, rows).includes(page);
}

/**
 * Les contacts sont affichés à la fois sur le Pipeline et la page Contacts :
 * la lecture est autorisée dès qu'on a l'une des deux pages.
 */
export function canReadContacts(role: RoleKey, rows: RolePermissionRow[]): boolean {
  return (
    canAccessPage(role, "pipeline", rows) || canAccessPage(role, "contacts", rows)
  );
}

/** L'écriture des contacts nécessite l'accès à la page Contacts. */
export function canWriteContacts(role: RoleKey, rows: RolePermissionRow[]): boolean {
  return canAccessPage(role, "contacts", rows);
}

/** Erreur levée lorsqu'un changement retirerait le dernier administrateur. */
export const LAST_ADMIN_ERROR =
  "Impossible de retirer le dernier administrateur.";

/**
 * Empêche de retirer le rôle admin au dernier administrateur (verrouillage
 * total de l'administration sans recours).
 */
export function assertRoleChangeAllowed(params: {
  currentRole: RoleKey;
  newRole: RoleKey;
  adminCount: number;
}): void {
  const removingAdmin =
    params.currentRole === "admin" && params.newRole !== "admin";
  if (removingAdmin && params.adminCount <= 1) {
    throw new Error(LAST_ADMIN_ERROR);
  }
}

/** Ajoute ou retire une seule page (opération idempotente, sans doublon). */
export function applyPageDelta(
  current: PageKey[],
  page: PageKey,
  enabled: boolean,
): PageKey[] {
  if (enabled) {
    return current.includes(page) ? current : [...current, page];
  }
  return current.filter((p) => p !== page);
}

/**
 * Garantit que le rôle admin conserve toujours l'accès à la page admin, pour
 * éviter de verrouiller l'administration côté serveur.
 */
export function sanitizeRolePages(role: RoleKey, pages: PageKey[]): PageKey[] {
  if (role === "admin" && !pages.includes("admin")) {
    return [...pages, "admin"];
  }
  return pages;
}

/**
 * Tente de retrouver l'utilisateur correspondant à un ancien `contact_sciam`
 * (texte libre) par correspondance exacte de nom (insensible à la casse).
 * Renvoie `undefined` si aucune ou plusieurs correspondances (pas de devinette).
 */
export function matchOwnerByName(
  name: string | undefined | null,
  users: { user_id: string; name: string }[],
): string | undefined {
  const needle = (name ?? "").trim().toLowerCase();
  if (!needle) return undefined;
  const matches = users.filter((u) => u.name.trim().toLowerCase() === needle);
  return matches.length === 1 ? matches[0].user_id : undefined;
}
