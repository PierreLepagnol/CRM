// @vitest-environment edge-runtime
import { register } from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";

import { api, components } from "./_generated/api";
import schema from "./schema";
import type { RoleKey } from "./lib/validators";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

/**
 * Tests d'autorisation END-TO-END au niveau handler : on enregistre le composant
 * better-auth (helper officiel `register`), on sème un utilisateur + session
 * réels dans le composant, puis on appelle les fonctions publiques via
 * `withIdentity`. C'est le seul moyen de vérifier que le modèle rôle/page
 * s'applique bien à travers `safeGetAuthUser` (sinon simulé uniquement au niveau
 * logique dans accessLogic.test.ts).
 */
function makeT() {
  const t = convexTest(schema, modules);
  register(t);
  return t;
}

/** Sème un utilisateur better-auth + session + rôle applicatif, renvoie l'accès identifié. */
async function asRole(t: ReturnType<typeof makeT>, role: RoleKey) {
  const now = Date.now();
  const { userId, sessionId } = await t.run(async (ctx) => {
    const userId = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: { name: role, email: `${role}@x.fr`, emailVerified: true, createdAt: now, updatedAt: now },
      },
    })) as unknown as { _id: string };
    const sessionId = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: { userId: userId._id, token: `tok-${role}`, expiresAt: now + 1e7, createdAt: now, updatedAt: now },
      },
    })) as unknown as { _id: string };
    await ctx.db.insert("app_users", {
      user_id: userId._id,
      email: `${role}@x.fr`,
      name: role,
      role,
      updated_at: now,
    });
    return { userId: userId._id, sessionId: sessionId._id };
  });
  return t.withIdentity({ subject: userId, sessionId });
}

async function seedContact(t: ReturnType<typeof makeT>) {
  return await t.run((ctx) =>
    ctx.db.insert("contacts", {
      prenom: "Jane",
      nom: "Doe",
      stage: "nouveau",
      position: 0,
      created_by: "seed",
      updated_at: 1,
    }),
  );
}

describe("autorisation par rôle (end-to-end, à travers better-auth)", () => {
  let t: ReturnType<typeof makeT>;
  beforeEach(() => {
    t = makeT();
  });

  it("lecteur : LIT les contacts mais ne peut pas en CRÉER", { timeout: 30000 }, async () => {
    const lecteur = await asRole(t, "lecteur");
    await seedContact(t);
    await expect(lecteur.query(api.contacts.list, {})).resolves.toHaveLength(1);
    await expect(
      lecteur.mutation(api.contacts.create, { prenom: "X", nom: "Y" }),
    ).rejects.toThrow(/Accès refusé/);
  });

  it("lecteur : pas d'accès à la page Projets (lecture ET écriture refusées)", { timeout: 30000 }, async () => {
    const lecteur = await asRole(t, "lecteur");
    // Authentifié mais sans la page projets → refus (le [] n'est que pour le
    // chargement non authentifié).
    await expect(lecteur.query(api.projects.list, {})).rejects.toThrow(/Accès refusé/);
    await expect(
      lecteur.mutation(api.projects.create, { titre: "P", type: "interne", statut: "a_demarrer" }),
    ).rejects.toThrow(/Accès refusé/);
  });

  it("commercial : peut CRÉER un contact, mais pas administrer", { timeout: 30000 }, async () => {
    const commercial = await asRole(t, "commercial");
    await expect(
      commercial.mutation(api.contacts.create, { prenom: "X", nom: "Y" }),
    ).resolves.toBeDefined();
    await expect(commercial.query(api.access.listRolePermissions, {})).rejects.toThrow(
      /Accès refusé/,
    );
  });

  it("admin : peut administrer les rôles", { timeout: 30000 }, async () => {
    const admin = await asRole(t, "admin");
    await expect(admin.query(api.access.listRolePermissions, {})).resolves.toBeDefined();
  });

  it("lecteur : ne peut pas écrire d'interaction (write model)", { timeout: 30000 }, async () => {
    const lecteur = await asRole(t, "lecteur");
    const contactId = await seedContact(t);
    await expect(
      lecteur.mutation(api.interactions.create, {
        contact_id: contactId,
        type: "email",
        date_at: Date.now(),
        resume: "x",
      }),
    ).rejects.toThrow(/Accès refusé/);
  });
});
