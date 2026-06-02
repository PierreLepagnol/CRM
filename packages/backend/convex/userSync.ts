import type { MutationCtx } from "./_generated/server";
import { DEFAULT_ROLE, type RoleKey } from "./lib/validators";

/**
 * Synchronisation de la table applicative `app_users` avec les utilisateurs
 * better-auth. Ces helpers sont appelés depuis les triggers définis dans
 * `auth.ts` (modèle "user").
 */

type AuthUserDoc = {
  _id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function findAppUser(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("app_users")
    .withIndex("by_user_id", (q) => q.eq("user_id", userId))
    .first();
}

/** Rôle attribué à la création : admin si premier utilisateur ou email listé. */
async function bootstrapRole(ctx: MutationCtx, email: string): Promise<RoleKey> {
  if (adminEmails.includes(email.toLowerCase())) return "admin";
  const existing = await ctx.db.query("app_users").first();
  if (existing === null) return "admin";
  return DEFAULT_ROLE;
}

export async function syncUserOnCreate(ctx: MutationCtx, user: AuthUserDoc) {
  const email = user.email ?? "";
  const existing = await findAppUser(ctx, user._id);
  if (existing) {
    await ctx.db.patch(existing._id, {
      email,
      name: user.name ?? email,
      image: user.image ?? undefined,
      updated_at: Date.now(),
    });
    return;
  }
  const role = await bootstrapRole(ctx, email);
  await ctx.db.insert("app_users", {
    user_id: user._id,
    email,
    name: user.name ?? email,
    image: user.image ?? undefined,
    role,
    updated_at: Date.now(),
  });
}

export async function syncUserOnUpdate(ctx: MutationCtx, user: AuthUserDoc) {
  const existing = await findAppUser(ctx, user._id);
  const email = user.email ?? "";
  if (!existing) {
    await syncUserOnCreate(ctx, user);
    return;
  }
  await ctx.db.patch(existing._id, {
    email,
    name: user.name ?? email,
    image: user.image ?? undefined,
    updated_at: Date.now(),
  });
}

export async function syncUserOnDelete(ctx: MutationCtx, user: AuthUserDoc) {
  const existing = await findAppUser(ctx, user._id);
  if (existing) await ctx.db.delete(existing._id);
}
