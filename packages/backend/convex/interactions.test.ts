// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

/**
 * Régression sécurité : les quatre fonctions publiques d'`interactions` doivent
 * refuser les appels non authentifiés (elles ne faisaient historiquement qu'un
 * check d'authentification sans modèle de rôle, et `update`/`remove` ne
 * vérifiaient même pas l'existence du document).
 *
 * Limite du harnais : le composant better-auth n'est pas simulable via
 * `withIdentity` (cf. contacts.test.ts), on ne peut donc tester ici que le
 * refus non-authentifié — le refus par rôle (`lecteur`) est porté par
 * `lib/accessLogic.test.ts`.
 */

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const contactId = await ctx.db.insert("contacts", {
      prenom: "Jane",
      nom: "Doe",
      stage: "nouveau",
      position: 0,
      created_by: "u1",
      updated_at: 1,
    });
    const interactionId = await ctx.db.insert("interactions", {
      contact_id: contactId,
      type: "email",
      date_at: 1,
      resume: "premier échange",
      created_by: "u1",
    });
    return { contactId, interactionId };
  });
}

describe("interactions — refus non authentifié", () => {
  it("listByContact renvoie [] sans identité (fail-closed)", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { contactId } = await seed(t);
    await expect(
      t.query(api.interactions.listByContact, { contact_id: contactId }),
    ).resolves.toEqual([]);
  });

  it("create est refusé sans identité", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { contactId } = await seed(t);
    await expect(
      t.mutation(api.interactions.create, {
        contact_id: contactId,
        type: "appel",
        date_at: Date.now(),
        resume: "x",
      }),
    ).rejects.toThrow();
  });

  it("update est refusé sans identité (le résumé reste intact)", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { interactionId } = await seed(t);
    await expect(
      t.mutation(api.interactions.update, { id: interactionId, resume: "pwn" }),
    ).rejects.toThrow();
    const row = await t.run((ctx) => ctx.db.get(interactionId));
    expect(row?.resume).toBe("premier échange");
  });

  it("remove est refusé sans identité (le document survit)", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { interactionId } = await seed(t);
    await expect(
      t.mutation(api.interactions.remove, { id: interactionId }),
    ).rejects.toThrow();
    const row = await t.run((ctx) => ctx.db.get(interactionId));
    expect(row).not.toBeNull();
  });

  it("contacts.update rejette les champs legacy (entreprise/contact_sciam)", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { contactId } = await seed(t);
    // Validation d'arguments Convex (avant le handler) : le champ n'existe plus
    // dans contactPatchFields, donc rejet même avec un patch par ailleurs valide.
    await expect(
      t.mutation(api.contacts.update, {
        id: contactId,
        patch: { entreprise: "ACME" } as unknown as { nom: string },
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.contacts.update, {
        id: contactId,
        patch: { contact_sciam: "Bruno" } as unknown as { nom: string },
      }),
    ).rejects.toThrow();
  });

  it("les mutations contacts/projects sont aussi refusées sans identité", { timeout: 30000 }, async () => {
    const t = convexTest(schema, modules);
    const { contactId } = await seed(t);
    await expect(
      t.mutation(api.contacts.update, { id: contactId, patch: { nom: "X" } }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.contacts.remove, { id: contactId }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.projects.create, {
        titre: "P",
        type: "interne",
        statut: "a_demarrer",
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.users.setRoleByUserId, { user_id: "u1", role: "admin" }),
    ).rejects.toThrow();
  });
});
