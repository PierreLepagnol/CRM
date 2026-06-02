import {
  createClient,
  type AuthFunctions,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import {
  syncUserOnCreate,
  syncUserOnDelete,
  syncUserOnUpdate,
} from "./userSync";

const siteUrl = process.env.SITE_URL!;
const trustedOrigins = [
  siteUrl,
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

// Annotation explicite pour casser l'inférence circulaire (auth ↔ internal).
const authFunctions: AuthFunctions = internal.auth as unknown as AuthFunctions;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        await syncUserOnCreate(ctx, user as { _id: string });
      },
      onUpdate: async (ctx, newUser) => {
        await syncUserOnUpdate(ctx, newUser as { _id: string });
      },
      onDelete: async (ctx, user) => {
        await syncUserOnDelete(ctx, user as { _id: string });
      },
    },
  },
  authFunctions,
});

// Mutations internes exécutant les callbacks de triggers ci-dessus,
// référencées par `authFunctions`.
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: Array.from(new Set(trustedOrigins)),
    database: authComponent.adapter(ctx),
    socialProviders: {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        tenantId: process.env.MICROSOFT_TENANT_ID!,
        allowDangerousEmailAccountLinking: true,
      },
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
