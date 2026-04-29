import { ConvexError } from "convex/values";

import { authComponent } from "../auth";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Renvoie l'`_id` (string) de l'utilisateur authentifié via better-auth.
 * Lève si non authentifié.
 *
 * Convention : on stocke ce string dans `owner_id`, `created_by`, `actor_id`.
 * Cf. guideline Convex : "NEVER accept a userId argument for authorization;
 * derive it server-side via ctx.auth.getUserIdentity()".
 */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new ConvexError("Non authentifié");
  }
  return user._id as string;
}
