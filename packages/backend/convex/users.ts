import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { requireAdmin } from "./access";
import {
  applyPageDelta,
  assertRoleChangeAllowed,
  sanitizeRolePages,
} from "./lib/accessLogic";
import {
  DEFAULT_ROLE_PAGES,
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
    const rows = await ctx.db.query("app_users").collect();
    return rows
      .map((u) => ({
        _id: u._id,
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
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

/** Change le rôle d'un utilisateur (admin uniquement, protège le dernier admin). */
export const setRole = mutation({
  args: { id: v.id("app_users"), role: roleKey },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Utilisateur introuvable");
    const allUsers = await ctx.db.query("app_users").collect();
    const adminCount = allUsers.filter((u) => u.role === "admin").length;
    try {
      assertRoleChangeAllowed({
        currentRole: existing.role as RoleKey,
        newRole: args.role as RoleKey,
        adminCount,
      });
    } catch (e) {
      throw new ConvexError(e instanceof Error ? e.message : "Changement refusé");
    }
    await ctx.db.patch(args.id, { role: args.role, updated_at: Date.now() });
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
