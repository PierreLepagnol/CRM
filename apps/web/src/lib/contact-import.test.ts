import { describe, expect, it } from "vitest";

import { autoDetectMapping, IMPORT_FIELDS, mapRowsToImportInput } from "./contact-import";

describe("autoDetectMapping (pré-remplit le mapping depuis les en-têtes)", () => {
  it("reconnaît les en-têtes de l'export français (l'inverse de contact-export)", () => {
    const mapping = autoDetectMapping([
      "Prénom",
      "Nom",
      "Entreprise",
      "Email",
      "Téléphone",
      "Profil LinkedIn",
      "Poste",
      "Montant",
    ]);
    expect(mapping).toMatchObject({
      Prénom: "prenom",
      Nom: "nom",
      Entreprise: "entreprise",
      Email: "email",
      Téléphone: "telephone",
      "Profil LinkedIn": "linkedin_url",
      Poste: "poste",
      Montant: "montant",
    });
  });

  it("laisse une colonne inconnue non mappée et n'attribue un champ qu'une fois", () => {
    const mapping = autoDetectMapping(["Nom", "Surnom", "nom"]);
    expect(mapping["Nom"]).toBe("nom");
    expect(mapping["Surnom"]).toBe(""); // inconnu
    expect(mapping["nom"]).toBe(""); // « nom » déjà pris par la 1ʳᵉ colonne
  });

  it("est insensible à la casse et aux accents", () => {
    expect(autoDetectMapping(["PRÉNOM"])["PRÉNOM"]).toBe("prenom");
    expect(autoDetectMapping(["telephone"])["telephone"]).toBe("telephone");
  });
});

describe("mapRowsToImportInput (projette en-tête → champ)", () => {
  it("ne retient que les colonnes mappées, en chaînes", () => {
    const mapping = autoDetectMapping(["Prénom", "Nom", "Email", "Inconnu"]);
    const rows = mapRowsToImportInput(
      [{ Prénom: "Jean", Nom: "Martin", Email: "j@x.fr", Inconnu: "ignoré" }],
      mapping,
    );
    expect(rows).toEqual([{ prenom: "Jean", nom: "Martin", email: "j@x.fr" }]);
  });

  it("inclut les neuf champs mappables v1, prénom et nom requis", () => {
    const required = IMPORT_FIELDS.filter((f) => "required" in f && f.required).map(
      (f) => f.key,
    );
    expect(IMPORT_FIELDS).toHaveLength(9);
    expect(required).toEqual(["prenom", "nom"]);
  });
});
