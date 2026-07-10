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

/**
 * Décision d'un garde d'accès, séparée de son effet (throw/return) pour être
 * testable sans Convex ni better-auth. `role === null` ⇒ non authentifié
 * (phase de chargement). Les fonctions Convex de `access.ts` traduisent
 * l'`outcome` : `unauthenticated` → repli chargement, `denied` → ConvexError.
 */
export type GuardOutcome = "unauthenticated" | "denied" | "allowed";

function decide(
  role: RoleKey | null,
  rows: RolePermissionRow[],
  allowed: (r: RoleKey, rows: RolePermissionRow[]) => boolean,
): GuardOutcome {
  if (role === null) return "unauthenticated";
  return allowed(role, rows) ? "allowed" : "denied";
}

export function decideContactRead(
  role: RoleKey | null,
  rows: RolePermissionRow[],
): GuardOutcome {
  return decide(role, rows, canReadContacts);
}

export function decideContactWrite(
  role: RoleKey | null,
  rows: RolePermissionRow[],
): GuardOutcome {
  return decide(role, rows, canWriteContacts);
}

export function decidePageAccess(
  role: RoleKey | null,
  page: PageKey,
  rows: RolePermissionRow[],
): GuardOutcome {
  return decide(role, rows, (r, rw) => canAccessPage(r, page, rw));
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
 * Normalise un nom pour comparaison floue : minuscules, sans accents, espaces
 * collapsés. "  Cédric  Munsch " → "cedric munsch".
 */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // diacritiques
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Renvoie l'unique `user_id` de la liste, ou `undefined` si 0 ou plusieurs. */
function singleUserId(
  matches: { user_id: string }[],
): string | undefined {
  const ids = [...new Set(matches.map((m) => m.user_id))];
  return ids.length === 1 ? ids[0] : undefined;
}

/**
 * Tente de retrouver l'utilisateur correspondant à un ancien `contact_sciam`
 * (texte libre) par rapprochement flou avec `app_users.name`, insensible à la
 * casse et aux accents. Stratégie par paliers, du plus sûr au plus permissif —
 * on s'arrête au premier palier qui désigne UN SEUL utilisateur :
 *   1. nom complet identique ("bruno martin" === "bruno martin")
 *   2. tous les mots saisis sont des mots du nom ("maurin" → "Maurin Voldoire")
 *   3. un mot saisi est le préfixe d'un mot du nom ("pier" → "Pierre Durand")
 * Renvoie `undefined` si aucune ou plusieurs correspondances (jamais de
 * devinette : on préfère laisser le contact sans propriétaire).
 */
export function matchOwnerByName(
  name: string | undefined | null,
  users: { user_id: string; name: string }[],
): string | undefined {
  const needle = normalizeName(name ?? "");
  if (!needle) return undefined;
  const needleTokens = needle.split(" ").filter(Boolean);

  const candidates = users.map((u) => {
    const norm = normalizeName(u.name);
    return { user_id: u.user_id, norm, tokens: norm.split(" ").filter(Boolean) };
  });

  // Palier 1 : nom complet identique.
  const exact = singleUserId(candidates.filter((c) => c.norm === needle));
  if (exact) return exact;

  // Palier 2 : chaque mot saisi est présent tel quel dans le nom de l'utilisateur.
  const tokenSubset = singleUserId(
    candidates.filter((c) => needleTokens.every((t) => c.tokens.includes(t))),
  );
  if (tokenSubset) return tokenSubset;

  // Palier 3 : un mot saisi (≥ 3 lettres) est le préfixe d'un mot du nom.
  const prefix = singleUserId(
    candidates.filter((c) =>
      needleTokens.some(
        (t) => t.length >= 3 && c.tokens.some((ct) => ct.startsWith(t)),
      ),
    ),
  );
  if (prefix) return prefix;

  return undefined;
}

/**
 * Choisit le propriétaire à affecter à un contact qui n'en a pas, lors du
 * rattrapage one-shot : on tente d'abord la correspondance par l'ancien
 * `contact_sciam` (texte libre), puis on retombe sur un utilisateur par défaut
 * pour ne laisser aucun contact orphelin.
 */
export function pickBackfillOwner({
  contactSciam,
  users,
  defaultUserId,
}: {
  contactSciam: string | undefined | null;
  users: { user_id: string; name: string }[];
  defaultUserId: string;
}): string {
  return matchOwnerByName(contactSciam, users) ?? defaultUserId;
}

type AuthUserLike = {
  _id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};
type AppUserLike = {
  user_id: string;
  role: RoleKey;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};
export type MergedUser = {
  user_id: string;
  name: string;
  email: string;
  image?: string;
  role: RoleKey;
  provisioned: boolean;
};

/**
 * Fusionne tous les utilisateurs connectés (table better-auth) avec leur rôle
 * applicatif. Les utilisateurs sans ligne `app_users` ont par défaut le rôle
 * le moins privilégié (`lecteur`) et `provisioned: false`.
 */
export function mergeAuthUsersWithRoles(
  authUsers: AuthUserLike[],
  appUsers: AppUserLike[],
): MergedUser[] {
  const byId = new Map(appUsers.map((a) => [a.user_id, a]));
  return authUsers
    .map((u) => {
      const app = byId.get(u._id);
      return {
        user_id: u._id,
        name: app?.name ?? u.name ?? u.email ?? "",
        email: app?.email ?? u.email ?? "",
        image: app?.image ?? u.image ?? undefined,
        role: resolveRole(app?.role),
        provisioned: Boolean(app),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
