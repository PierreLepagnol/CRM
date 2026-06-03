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
