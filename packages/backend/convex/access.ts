import { ConvexError } from "convex/values";

import { authComponent } from "./auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import {
  allowedPagesFromRows,
  canAccessPage,
  canReadContacts,
  canWriteContacts,
  resolveRole,
  type RolePermissionRow,
} from "./lib/accessLogic";
import type { PageKey, RoleKey } from "./lib/validators";

type Ctx = QueryCtx | MutationCtx;

/** Ligne `app_users` de l'utilisateur authentifié, ou null. */
export async function getCurrentAppUser(ctx: Ctx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;
  const userId = authUser._id as string;
  const appUser = await ctx.db
    .query("app_users")
    .withIndex("by_user_id", (q) => q.eq("user_id", userId))
    .first();
  return { authUser, appUser };
}

/** Toutes les lignes `role_permissions` (petite table, ≤ nb de rôles). */
async function getRolePermissionRows(ctx: Ctx): Promise<RolePermissionRow[]> {
  const rows = await ctx.db.query("role_permissions").collect();
  return rows.map((r) => ({
    role: r.role as RoleKey,
    pages: r.pages as PageKey[],
  }));
}

/** Pages autorisées pour un rôle (table `role_permissions`, repli par défaut). */
export async function allowedPagesForRole(
  ctx: Ctx,
  role: RoleKey,
): Promise<PageKey[]> {
  return allowedPagesFromRows(role, await getRolePermissionRows(ctx));
}

/** Contexte d'autorisation courant : rôle effectif + permissions. */
async function currentRoleContext(ctx: Ctx) {
  const current = await getCurrentAppUser(ctx);
  if (!current) return null;
  return {
    role: resolveRole(current.appUser?.role as RoleKey | undefined),
    rows: await getRolePermissionRows(ctx),
  };
}

/**
 * Variante douce pour les `query` de lecture : renvoie `null` si non
 * authentifié (phase de chargement), sinon un booléen d'autorisation.
 */
export async function hasPageAccess(
  ctx: Ctx,
  page: PageKey,
): Promise<boolean | null> {
  const c = await currentRoleContext(ctx);
  if (!c) return null;
  return canAccessPage(c.role, page, c.rows);
}

/** Lève "Accès refusé" si la page n'est pas autorisée pour le rôle courant. */
export async function requirePageAccess(ctx: Ctx, page: PageKey): Promise<void> {
  const c = await currentRoleContext(ctx);
  if (!c) throw new ConvexError("Non authentifié");
  if (!canAccessPage(c.role, page, c.rows)) throw new ConvexError("Accès refusé");
}

/**
 * Lecture des contacts : autorisée avec l'accès Pipeline OU Contacts.
 * Renvoie `false` (chargement) si non authentifié, sinon lève si refusé.
 */
export async function guardContactRead(ctx: Ctx): Promise<boolean> {
  const c = await currentRoleContext(ctx);
  if (!c) return false;
  if (!canReadContacts(c.role, c.rows)) throw new ConvexError("Accès refusé");
  return true;
}

/** Écriture des contacts : nécessite l'accès à la page Contacts. */
export async function requireContactWrite(ctx: Ctx): Promise<void> {
  const c = await currentRoleContext(ctx);
  if (!c) throw new ConvexError("Non authentifié");
  if (!canWriteContacts(c.role, c.rows)) throw new ConvexError("Accès refusé");
}

/** Lève sauf si l'utilisateur courant est admin. */
export async function requireAdmin(ctx: Ctx): Promise<void> {
  const current = await getCurrentAppUser(ctx);
  if (!current) throw new ConvexError("Non authentifié");
  if (current.appUser?.role !== "admin") throw new ConvexError("Accès refusé");
}

/** Toutes les permissions de rôle définies (admin uniquement). */
export const listRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("role_permissions").collect();
    return rows.map((r) => ({ role: r.role, pages: r.pages }));
  },
});

/** Source de vérité côté front : rôle + pages autorisées. */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const current = await getCurrentAppUser(ctx);
    if (!current) return null;
    const { authUser, appUser } = current;
    const role = resolveRole(appUser?.role as RoleKey | undefined);
    const allowedPages = await allowedPagesForRole(ctx, role);
    return {
      user_id: authUser._id as string,
      name: appUser?.name ?? authUser.name ?? "",
      email: appUser?.email ?? authUser.email ?? "",
      image: appUser?.image,
      role,
      allowedPages,
    };
  },
});
