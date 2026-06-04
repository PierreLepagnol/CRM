// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

const PIERRE_EMAIL = "pierre.lepagnol@sciam.fr";

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("app_users", {
      user_id: "pierre",
      email: PIERRE_EMAIL,
      name: "Pierre Lepagnol",
      role: "admin",
      updated_at: 1,
    });
    await ctx.db.insert("app_users", {
      user_id: "maurin",
      email: "maurin@sciam.fr",
      name: "Maurin Voldoire",
      role: "commercial",
      updated_at: 1,
    });

    // A: legacy name matches a known user → should get that user.
    await ctx.db.insert("contacts", {
      prenom: "A",
      nom: "Matched",
      contact_sciam: "Maurin",
      stage: "nouveau",
      position: 0,
      created_by: "x",
      updated_at: 1,
    });
    // B: legacy name matches nobody → should fall back to the default user.
    await ctx.db.insert("contacts", {
      prenom: "B",
      nom: "Unmatched",
      contact_sciam: "Parfait Inconnu",
      stage: "nouveau",
      position: 1,
      created_by: "x",
      updated_at: 1,
    });
    // C: already has an owner → must stay untouched.
    await ctx.db.insert("contacts", {
      prenom: "C",
      nom: "Owned",
      owner_id: "someone-else",
      stage: "nouveau",
      position: 2,
      created_by: "x",
      updated_at: 1,
    });
  });
}

async function ownerOf(t: ReturnType<typeof convexTest>, nom: string) {
  return await t.run(async (ctx) => {
    const all = await ctx.db.query("contacts").collect();
    return all.find((c) => c.nom === nom)?.owner_id;
  });
}

describe("backfillContactOwners", () => {
  it("assigns the name-matched user, defaults the rest to Pierre, and leaves owned contacts untouched", async () => {
    const t = convexTest(schema, modules);
    await seed(t);

    await t.mutation(internal.migrations.backfillContactOwners, {});

    expect(await ownerOf(t, "Matched")).toBe("maurin");
    expect(await ownerOf(t, "Unmatched")).toBe("pierre");
    expect(await ownerOf(t, "Owned")).toBe("someone-else");
  });
});

async function seedEntrepriseTexts(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    // Deux orthographes équivalentes de la même entreprise → une seule entreprise.
    await ctx.db.insert("contacts", {
      prenom: "K", nom: "Belamri", entreprise: "Generali",
      stage: "nouveau", position: 0, created_by: "u1", updated_at: 1,
    });
    await ctx.db.insert("contacts", {
      prenom: "C", nom: "Defraine", entreprise: "  generali ",
      stage: "nouveau", position: 1, created_by: "u1", updated_at: 1,
    });
    // Orthographe distincte → entreprise distincte (pas de fusion floue).
    await ctx.db.insert("contacts", {
      prenom: "J", nom: "Queinnec", entreprise: "Crédit Logement",
      stage: "nouveau", position: 2, created_by: "u1", updated_at: 1,
    });
    // Sans entreprise → reste non rattaché.
    await ctx.db.insert("contacts", {
      prenom: "Y", nom: "SansBoite",
      stage: "nouveau", position: 3, created_by: "u1", updated_at: 1,
    });
    // Supprimé → ignoré.
    await ctx.db.insert("contacts", {
      prenom: "Z", nom: "Mort", entreprise: "Fantôme",
      stage: "nouveau", position: 4, created_by: "u1", updated_at: 1, deleted_at: 2,
    });
  });
}

async function contactByNom(t: ReturnType<typeof convexTest>, nom: string) {
  return await t.run(async (ctx) => {
    const all = await ctx.db.query("contacts").collect();
    return all.find((c) => c.nom === nom);
  });
}

describe("backfillEntreprises", () => {
  it("crée une entreprise par nom normalisé distinct et rattache les contacts", async () => {
    const t = convexTest(schema, modules);
    await seedEntrepriseTexts(t);

    await t.mutation(internal.migrations.backfillEntreprises, {});

    const entreprises = await t.run((ctx) => ctx.db.query("entreprises").collect());
    // Generali (×2 orthographes) + Crédit Logement = 2. (Fantôme est supprimé.)
    expect(entreprises.length).toBe(2);

    const belamri = await contactByNom(t, "Belamri");
    const defraine = await contactByNom(t, "Defraine");
    // Les deux orthographes de Generali pointent vers la MÊME entreprise.
    expect(belamri?.entreprise_id).toBeDefined();
    expect(belamri?.entreprise_id).toBe(defraine?.entreprise_id);

    const queinnec = await contactByNom(t, "Queinnec");
    expect(queinnec?.entreprise_id).toBeDefined();
    expect(queinnec?.entreprise_id).not.toBe(belamri?.entreprise_id);

    // Contact sans entreprise : non rattaché.
    expect((await contactByNom(t, "SansBoite"))?.entreprise_id).toBeUndefined();
    // Contact supprimé : non rattaché, et son entreprise n'est pas créée.
    expect((await contactByNom(t, "Mort"))?.entreprise_id).toBeUndefined();
  });
});
