// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "./schema";

// convex-test découvre les modules (et le composant better-auth déclaré dans
// convex.config.ts) via ce glob. `import.meta.glob` est fourni par Vite/vitest
// mais inconnu du typecheck Convex (tsc), d'où le cast.
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.*s",
);

/**
 * Régression : la recherche de contacts doit indexer le PRÉNOM, pas seulement
 * le nom. Bug rapporté : "Karima" (prénom) ne renvoyait rien alors que
 * "Belamri" (nom) fonctionnait.
 *
 * Le handler `contacts.search` est protégé par `guardContactRead`, qui lit le
 * composant better-auth (non simulable via withIdentity). On vérifie donc la
 * correction réelle au niveau des index de recherche, sous la garde d'auth.
 */
async function seedKarimaBelamri(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("contacts", {
      prenom: "Karima",
      nom: "Belamri",
      stage: "nouveau",
      position: 0,
      created_by: "u1",
      updated_at: 1,
    });
  });
}

describe("contacts search indexes", () => {
  it("trouve un contact par son PRÉNOM (régression: Karima)", async () => {
    const t = convexTest(schema, modules);
    await seedKarimaBelamri(t);

    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withSearchIndex("search_prenom", (q) => q.search("prenom", "Karima"))
        .collect(),
    );

    expect(hits.map((c) => `${c.prenom} ${c.nom}`)).toEqual(["Karima Belamri"]);
  });

  it("trouve toujours un contact par son NOM (Belamri)", async () => {
    const t = convexTest(schema, modules);
    await seedKarimaBelamri(t);

    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withSearchIndex("search_nom", (q) => q.search("nom", "Belamri"))
        .collect(),
    );

    expect(hits.map((c) => `${c.prenom} ${c.nom}`)).toEqual(["Karima Belamri"]);
  });

  it("l'index nom ne capte PAS le prénom (les champs restent distincts)", async () => {
    const t = convexTest(schema, modules);
    await seedKarimaBelamri(t);

    const hits = await t.run((ctx) =>
      ctx.db
        .query("contacts")
        .withSearchIndex("search_nom", (q) => q.search("nom", "Karima"))
        .collect(),
    );

    expect(hits).toEqual([]);
  });
});
