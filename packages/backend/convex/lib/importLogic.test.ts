import { describe, expect, it } from "vitest";

import {
  buildClassifyContext,
  buildEnrichmentPatch,
  classifyRow,
  collapseByEmail,
  type ContactMergeInput,
  normalizeEmail,
  parseMontant,
  resolveFieldMerge,
} from "./importLogic";

describe("normalizeEmail (clé de dédoublonnage)", () => {
  it("passe en minuscules et retire les espaces de bord", () => {
    expect(normalizeEmail("  Jean.Martin@Banque.FR  ")).toBe("jean.martin@banque.fr");
  });

  it("une ligne sans email n'a pas de clé (jamais un doublon)", () => {
    expect(normalizeEmail("")).toBeUndefined();
    expect(normalizeEmail("   ")).toBeUndefined();
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});

describe("parseMontant (formats français)", () => {
  it("nettoie espaces, NBSP, € et virgule décimale", () => {
    expect(parseMontant("1 234,56 €")).toEqual({ ok: true, value: 1234.56 });
  });

  it("accepte une cellule vide (montant optionnel)", () => {
    expect(parseMontant("")).toEqual({ ok: true, value: undefined });
    expect(parseMontant(undefined)).toEqual({ ok: true, value: undefined });
  });

  it("rejette une valeur non-parsable (erreur bloquante)", () => {
    expect(parseMontant("abc")).toEqual({ ok: false, error: expect.any(String) });
    expect(parseMontant("12,3,4")).toMatchObject({ ok: false });
  });

  it("rejette un montant négatif", () => {
    expect(parseMontant("-50")).toMatchObject({ ok: false });
  });
});

describe("resolveFieldMerge — « remplir si vide » (défaut, Enrichissement)", () => {
  it("ne touche jamais une donnée déjà saisie", () => {
    expect(resolveFieldMerge("fill_if_empty", "0612345678", "0700000000")).toBe(
      "0612345678",
    );
  });

  it("complète le champ quand l'existant est vide", () => {
    expect(resolveFieldMerge("fill_if_empty", undefined, "0700000000")).toBe(
      "0700000000",
    );
  });

  it("« l'import écrase » remplace l'existant, mais jamais avec du vide", () => {
    expect(resolveFieldMerge("overwrite", "ancien", "nouveau")).toBe("nouveau");
    expect(resolveFieldMerge("overwrite", "ancien", "   ")).toBe("ancien");
  });

  it("« ne pas toucher » conserve toujours l'existant", () => {
    expect(resolveFieldMerge("ignore", "ancien", "nouveau")).toBe("ancien");
    expect(resolveFieldMerge("ignore", undefined, "nouveau")).toBeUndefined();
  });
});

describe("collapseByEmail — doublons intra-fichier (la première l'emporte)", () => {
  it("fusionne deux lignes de même email (casse ignorée) : 1ʳᵉ gagne, champs vides comblés, notes concaténées", () => {
    const { rows, warnings } = collapseByEmail([
      { prenom: "Jean", nom: "Martin", email: "a@x.fr", telephone: "", notes: "Note A" },
      { prenom: "", nom: "", email: "A@X.FR", telephone: "0612", notes: "Note B" },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      prenom: "Jean",
      nom: "Martin",
      telephone: "0612",
      notes: "Note A\n\nNote B",
    });
    expect(warnings).toEqual([{ email: "a@x.fr", mergedCount: 2 }]);
  });

  it("ne fusionne jamais des lignes sans email (homonymes restent distincts)", () => {
    const { rows, warnings } = collapseByEmail([
      { prenom: "Jean", nom: "Martin" },
      { prenom: "Jean", nom: "Martin" },
    ]);
    expect(rows).toHaveLength(2);
    expect(warnings).toEqual([]);
  });
});

describe("classifyRow — Création / Enrichissement / erreur", () => {
  const emptyCtx = buildClassifyContext({ contacts: [], entreprises: [] });

  it("une ligne valide sans email est une Création", () => {
    const c = classifyRow({ prenom: "Jean", nom: "Martin" }, emptyCtx);
    expect(c.kind).toBe("creation");
  });

  it("un email correspondant à un Contact existant est un Enrichissement", () => {
    const ctx = buildClassifyContext({
      contacts: [{ id: "c1", email: "Jean.Martin@Banque.FR" }],
      entreprises: [],
    });
    const c = classifyRow(
      { prenom: "Jean", nom: "Martin", email: " jean.martin@banque.fr " },
      ctx,
    );
    expect(c).toMatchObject({ kind: "enrichissement", matchedContactId: "c1" });
  });

  it("une ligne sans prénom OU sans nom est une erreur bloquante", () => {
    expect(classifyRow({ prenom: "", nom: "Martin" }, emptyCtx).kind).toBe("error");
    expect(classifyRow({ prenom: "Jean", nom: "  " }, emptyCtx).kind).toBe("error");
  });

  it("un montant invalide bloque la ligne", () => {
    const c = classifyRow({ prenom: "Jean", nom: "Martin", montant: "abc" }, emptyCtx);
    expect(c.kind).toBe("error");
  });

  it("normalise le montant français dans les valeurs nettoyées", () => {
    const c = classifyRow(
      { prenom: "Jean", nom: "Martin", montant: "1 234,50 €" },
      emptyCtx,
    );
    expect(c).toMatchObject({ kind: "creation", values: { montant: 1234.5 } });
  });

  it("rattache l'Entreprise sur correspondance exacte de nom normalisé", () => {
    const ctx = buildClassifyContext({
      contacts: [],
      entreprises: [{ id: "e1", nom: "Crédit Agricole CIB" }],
    });
    const c = classifyRow(
      { prenom: "Jean", nom: "Martin", entreprise: "  crédit agricole cib " },
      ctx,
    );
    expect(c).toMatchObject({
      kind: "creation",
      entreprise: { kind: "matched", entrepriseId: "e1" },
    });
  });

  it("remonte un nom d'Entreprise inconnu pour résolution en revue (jamais créé en silence)", () => {
    const ctx = buildClassifyContext({
      contacts: [],
      entreprises: [{ id: "e1", nom: "Crédit Agricole CIB" }],
    });
    const c = classifyRow(
      { prenom: "Jean", nom: "Martin", entreprise: "Société Générale" },
      ctx,
    );
    expect(c).toMatchObject({
      kind: "creation",
      entreprise: { kind: "unresolved", nom: "Société Générale" },
    });
  });
});

describe("buildEnrichmentPatch — « remplir si vide », notes concaténées", () => {
  it("ne remplit que les champs vides et concatène les notes", () => {
    const patch = buildEnrichmentPatch(
      { telephone: "0612", notes_md: "Ancienne note" },
      {
        prenom: "Jean",
        nom: "Martin",
        telephone: "0700",
        linkedin_url: "https://li/x",
        notes: "Nouvelle note",
      },
      {},
      undefined,
    );
    // téléphone déjà saisi → non écrasé → absent du patch
    expect(patch.telephone).toBeUndefined();
    // linkedin vide → comblé
    expect(patch.linkedin_url).toBe("https://li/x");
    // notes concaténées (réutilise resolveMergedNotes)
    expect(patch.notes_md).toBe("Ancienne note\n\nNouvelle note");
  });

  it("ne touche jamais ni le stage ni le propriétaire (absents du patch)", () => {
    const patch = buildEnrichmentPatch(
      {},
      { prenom: "Jean", nom: "Martin", poste: "CTO" },
      {},
      undefined,
    );
    expect(patch).not.toHaveProperty("stage");
    expect(patch).not.toHaveProperty("owner_id");
  });

  it("comble le montant et l'entreprise vides, sans écraser les existants", () => {
    const filled = buildEnrichmentPatch(
      {},
      { prenom: "Jean", nom: "Martin", montant: 5000 },
      {},
      "e1",
    );
    expect(filled.montant).toBe(5000);
    expect(filled.entreprise_id).toBe("e1");

    const kept = buildEnrichmentPatch(
      { montant: 9000, entreprise_id: "eExist" },
      { prenom: "Jean", nom: "Martin", montant: 5000 },
      {},
      "e1",
    );
    expect(kept.montant).toBeUndefined();
    expect(kept.entreprise_id).toBeUndefined();
  });

  it("la surcharge « overwrite » remplace une valeur existante", () => {
    const patch = buildEnrichmentPatch(
      { poste: "Dev" },
      { prenom: "Jean", nom: "Martin", poste: "CTO" },
      { poste: "overwrite" },
      undefined,
    );
    expect(patch.poste).toBe("CTO");
  });

  it("une ligne strictement identique à l'existant ne produit aucun patch (no-op)", () => {
    const existing: ContactMergeInput = {
      email: "jean.martin@banque.fr",
      telephone: "0612345678",
      linkedin_url: "https://li/jm",
      poste: "CTO",
      montant: 9000,
      notes_md: "Note existante",
      entreprise_id: "e1",
    };
    const patch = buildEnrichmentPatch(
      existing,
      {
        prenom: "Jean",
        nom: "Martin",
        email: "jean.martin@banque.fr",
        telephone: "0612345678",
        linkedin_url: "https://li/jm",
        poste: "CTO",
        montant: 9000,
        notes: "Note existante",
      },
      {},
      "e1",
    );
    expect(Object.keys(patch)).toHaveLength(0);
  });

  it("des notes entrantes identiques à l'existant ne sont pas ré-concaténées (ré-import idempotent)", () => {
    const patch = buildEnrichmentPatch(
      { notes_md: "Note existante" },
      { prenom: "Jean", nom: "Martin", notes: "  Note existante  " },
      {},
      undefined,
    );
    expect(patch.notes_md).toBeUndefined();
  });
});
