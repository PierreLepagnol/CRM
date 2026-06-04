// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "./schema";
import { normalizeEntrepriseName } from "./lib/entrepriseLogic";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

async function seedEntreprises(t: ReturnType<typeof convexTest>, noms: string[]) {
  await t.run(async (ctx) => {
    let i = 0;
    for (const nom of noms) {
      await ctx.db.insert("entreprises", {
        nom,
        nom_normalise: normalizeEntrepriseName(nom),
        created_by: "u1",
        updated_at: ++i,
      });
    }
  });
}

describe("entreprises : index de recherche et de déduplication", () => {
  it("trouve une entreprise par son nom (index de recherche)", async () => {
    const t = convexTest(schema, modules);
    await seedEntreprises(t, ["Crédit Agricole CIB", "Crédit Mutuel"]);

    const hits = await t.run((ctx) =>
      ctx.db
        .query("entreprises")
        .withSearchIndex("search_nom", (q) => q.search("nom", "Crédit Agricole"))
        .collect(),
    );

    expect(hits.map((e) => e.nom)).toContain("Crédit Agricole CIB");
  });

  it("retrouve l'entreprise exacte par nom normalisé (garde-fou anti-doublon)", async () => {
    const t = convexTest(schema, modules);
    await seedEntreprises(t, ["Crédit Agricole CIB"]);

    const norm = normalizeEntrepriseName("  crédit  AGRICOLE cib ");
    const hit = await t.run((ctx) =>
      ctx.db
        .query("entreprises")
        .withIndex("by_nom_normalise", (q) => q.eq("nom_normalise", norm))
        .first(),
    );

    expect(hit?.nom).toBe("Crédit Agricole CIB");
  });
});
