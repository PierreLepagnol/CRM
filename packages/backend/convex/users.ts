import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { requireAdmin } from "./access";
import {
  applyPageDelta,
  assertRoleChangeAllowed,
  mergeAuthUsersWithRoles,
  sanitizeRolePages,
} from "./lib/accessLogic";
import {
  DEFAULT_ROLE_PAGES,
  LIST_CAP,
  pageKey,
  roleKey,
  type PageKey,
  type RoleKey,
} from "./lib/validators";
import { syncUserOnCreate } from "./userSync";

/** Liste des utilisateurs applicatifs (pour les sélecteurs et l'admin). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await authComponent.safeGetAuthUser(ctx))) return [];
    const rows = await ctx.db.query("app_users").take(LIST_CAP);
    // Projection volontairement sans `role` : réservé à l'admin (listAll).
    return rows
      .map((u) => ({
        _id: u._id,
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        image: u.image,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  },
});

/**
 * Garantit qu'une ligne `app_users` existe pour l'utilisateur courant.
 * Couvre les comptes SSO créés avant l'ajout des triggers. Applique aussi le
 * bootstrap admin (ADMIN_EMAILS / premier utilisateur).
 */
export const ensureSelf = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return null;
    await syncUserOnCreate(ctx, {
      _id: authUser._id as string,
      email: authUser.email,
      name: authUser.name,
      image: (authUser as { image?: string | null }).image,
    });
    return null;
  },
});

/**
 * Liste TOUS les utilisateurs déjà connectés au CRM (table better-auth),
 * fusionnés avec leur rôle applicatif. Les utilisateurs sans ligne `app_users`
 * apparaissent par défaut avec le rôle `lecteur`. Admin uniquement.
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Boucle sur le curseur : sinon `numItems` tronque silencieusement au-delà
    // de la première page (cf. audit #21).
    type AuthUserRow = { _id: string; name?: string; email?: string; image?: string };
    const page: AuthUserRow[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 100; guard++) {
      const res: { page: AuthUserRow[]; isDone: boolean; continueCursor: string } =
        await ctx.runQuery(components.betterAuth.adapter.findMany, {
          model: "user",
          where: [],
          paginationOpts: { numItems: 500, cursor },
        });
      page.push(...res.page);
      if (res.isDone) break;
      cursor = res.continueCursor;
    }
    const appUsers = await ctx.db.query("app_users").take(LIST_CAP);
    return mergeAuthUsersWithRoles(
      page,
      appUsers.map((u) => ({
        user_id: u.user_id,
        role: u.role as RoleKey,
        name: u.name,
        email: u.email,
        image: u.image,
      })),
    );
  },
});

/**
 * Définit le rôle d'un utilisateur par son `user_id` (admin uniquement).
 * Crée la ligne `app_users` si elle n'existe pas encore (utilisateur connecté
 * mais non provisionné). Protège le dernier administrateur.
 */
export const setRoleByUserId = mutation({
  args: { user_id: v.string(), role: roleKey },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("app_users")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .first();
    const allUsers = await ctx.db.query("app_users").take(LIST_CAP);
    const adminCount = allUsers.filter((u) => u.role === "admin").length;

    if (existing) {
      try {
        assertRoleChangeAllowed({
          currentRole: existing.role as RoleKey,
          newRole: args.role as RoleKey,
          adminCount,
        });
      } catch (e) {
        throw new ConvexError(
          e instanceof Error ? e.message : "Changement refusé",
        );
      }
      await ctx.db.patch(existing._id, { role: args.role, updated_at: Date.now() });
      return null;
    }

    // Utilisateur non provisionné : on récupère ses infos better-auth.
    const authUser = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.user_id }],
    })) as { email?: string; name?: string; image?: string } | null;
    await ctx.db.insert("app_users", {
      user_id: args.user_id,
      email: authUser?.email ?? "",
      name: authUser?.name ?? authUser?.email ?? "",
      image: authUser?.image ?? undefined,
      role: args.role,
      updated_at: Date.now(),
    });
    return null;
  },
});

/**
 * Active/désactive UNE page pour un rôle (admin uniquement). Le delta est
 * appliqué sur l'état serveur courant (et non un instantané client), ce qui
 * évite les pertes de mise à jour lors de bascules rapides. La page admin reste
 * toujours attachée au rôle admin.
 */
export const setRolePage = mutation({
  args: { role: roleKey, page: pageKey, enabled: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("role_permissions")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .first();
    const current = (
      existing ? (existing.pages as PageKey[]) : DEFAULT_ROLE_PAGES[args.role as RoleKey]
    );
    const next = sanitizeRolePages(
      args.role as RoleKey,
      applyPageDelta(current, args.page as PageKey, args.enabled),
    );
    if (existing) {
      await ctx.db.patch(existing._id, { pages: next, updated_at: Date.now() });
    } else {
      await ctx.db.insert("role_permissions", {
        role: args.role,
        pages: next,
        updated_at: Date.now(),
      });
    }
    return null;
  },
});
