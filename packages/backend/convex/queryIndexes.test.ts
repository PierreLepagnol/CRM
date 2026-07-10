// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "./schema";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

/**
 * Régressions sur les bornes d'index introduites au round d'audit :
 *  - `entreprises.searchByPrefix` : range scan sur `by_nom_normalise` (au lieu
 *    d'un scan complet + filtre JS).
 *  - `contacts.listDueRelances` : borne d'index `gte(0).lte(limit)` (au lieu
 *    d'un `.filter()` qui scannait les contacts sans relance).
 * On vérifie ici le comportement des index sous-jacents, la garde d'auth des
 * handlers n'étant pas simulable (cf. contacts.test.ts).
 */

describe("entreprises — range scan by_nom_normalise (préfixe)", () => {
  it("ne renvoie que les noms normalisés commençant par la saisie", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const nom_normalise of ["credit agricole", "credit agricole cib", "bnp paribas"]) {
        await ctx.db.insert("entreprises", {
          nom: nom_normalise,
          nom_normalise,
          created_by: "u1",
          updated_at: 1,
        });
      }
    });

    const norm = "credit agricole";
    const hits = await t.run((ctx) =>
      ctx.db
        .query("entreprises")
        .withIndex("by_active_nom_normalise", (q) =>
          q
            .eq("deleted_at", undefined)
            .gte("nom_normalise", norm)
            .lt("nom_normalise", norm + "￿"),
        )
        .take(20),
    );

    expect(hits.map((e) => e.nom_normalise).sort()).toEqual([
      "credit agricole",
      "credit agricole cib",
    ]);
  });
});

describe("contacts — soft-delete exclu AU NIVEAU DE L'INDEX (by_active_*)", () => {
  it("l'index actif ne renvoie pas les contacts supprimés", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const base = {
        prenom: "p",
        stage: "nouveau" as const,
        position: 0,
        created_by: "u1",
        updated_at: 1,
      };
      await ctx.db.insert("contacts", { ...base, nom: "actif" });
      await ctx.db.insert("contacts", { ...base, nom: "supprimé", deleted_at: 123 });
    });
    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withIndex("by_active_stage_position", (q) =>
          q.eq("deleted_at", undefined).eq("stage", "nouveau"),
        )
        .collect(),
    );
    expect(hits.map((c) => c.nom)).toEqual(["actif"]);
  });
});

describe("contacts — recherche par entreprise dénormalisée", () => {
  it("trouve un contact par le nom de son entreprise (entreprise_nom indexé)", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        prenom: "Yann",
        nom: "Nadjar",
        entreprise_nom: "La Poste",
        stage: "nouveau",
        position: 0,
        created_by: "u1",
        updated_at: 1,
      }),
    );

    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withSearchIndex("search_entreprise", (q) => q.search("entreprise_nom", "La Poste"))
        .take(10),
    );

    expect(hits.map((c) => c.nom)).toEqual(["Nadjar"]);
  });
});

describe("contacts — borne d'index by_next_relance_at", () => {
  it("exclut les contacts sans relance et ceux au-delà de la limite", async () => {
    const t = convexTest(schema, modules);
    const limit = 1000;
    await t.run(async (ctx) => {
      const base = {
        prenom: "p",
        nom: "n",
        stage: "nouveau" as const,
        position: 0,
        created_by: "u1",
        updated_at: 1,
      };
      await ctx.db.insert("contacts", { ...base, nom: "sans-relance" });
      await ctx.db.insert("contacts", { ...base, nom: "due", next_relance_at: 500 });
      await ctx.db.insert("contacts", { ...base, nom: "trop-tard", next_relance_at: 5000 });
    });

    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withIndex("by_active_next_relance", (q) =>
          q.eq("deleted_at", undefined).gte("next_relance_at", 0).lte("next_relance_at", limit),
        )
        .order("asc")
        .take(50),
    );

    expect(hits.map((c) => c.nom)).toEqual(["due"]);
  });
});
