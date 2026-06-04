import { describe, expect, it } from "vitest";

import {
  ENTREPRISE_HAS_CONTACTS_ERROR,
  assertEntrepriseDeletable,
  matchesPrefix,
  normalizeEntrepriseName,
  resolveMergedNotes,
} from "./entrepriseLogic";

describe("normalizeEntrepriseName", () => {
  it("colapse casse, accents et espaces multiples", () => {
    expect(normalizeEntrepriseName("  Crédit  Agricole ")).toBe(
      normalizeEntrepriseName("credit agricole"),
    );
    expect(normalizeEntrepriseName("  Crédit  Agricole ")).toBe("credit agricole");
  });

  it("distingue deux raisons sociales différentes", () => {
    expect(normalizeEntrepriseName("Crédit Agricole")).not.toBe(
      normalizeEntrepriseName("Crédit Agricole CIB"),
    );
  });
});

describe("resolveMergedNotes (fusion : survivant gagne, notes concaténées)", () => {
  it("concatène les notes de l'absorbée à la suite de celles du survivant", () => {
    expect(resolveMergedNotes("Note survivant", "Note absorbée")).toBe(
      "Note survivant\n\nNote absorbée",
    );
  });

  it("garde les notes de l'absorbée quand le survivant n'en a pas", () => {
    expect(resolveMergedNotes(undefined, "Note absorbée")).toBe("Note absorbée");
  });

  it("garde les notes du survivant quand l'absorbée n'en a pas", () => {
    expect(resolveMergedNotes("Note survivant", undefined)).toBe("Note survivant");
  });

  it("renvoie undefined quand aucune des deux n'a de notes", () => {
    expect(resolveMergedNotes(undefined, undefined)).toBeUndefined();
  });
});

describe("assertEntrepriseDeletable (suppression bloquée si contacts rattachés)", () => {
  it("autorise la suppression quand aucun contact n'est rattaché", () => {
    expect(() => assertEntrepriseDeletable(0)).not.toThrow();
  });

  it("refuse la suppression dès qu'un contact est rattaché", () => {
    expect(() => assertEntrepriseDeletable(1)).toThrow(ENTREPRISE_HAS_CONTACTS_ERROR);
    expect(() => assertEntrepriseDeletable(5)).toThrow(ENTREPRISE_HAS_CONTACTS_ERROR);
  });
});

describe("matchesPrefix (autocomplétion « commence par »)", () => {
  it("matche un nom qui commence par la saisie (accents/casse ignorés)", () => {
    expect(matchesPrefix("Crédit Agricole", "Crédit Agricole CIB")).toBe(true);
    expect(matchesPrefix("credit agricole", "Crédit Agricole CIB")).toBe(true);
  });

  it("ne matche pas un nom qui ne commence pas par la saisie", () => {
    expect(matchesPrefix("Crédit Agricole", "Crédit Mutuel")).toBe(false);
    expect(matchesPrefix("Agricole", "Crédit Agricole CIB")).toBe(false);
  });

  it("une saisie vide ne matche rien", () => {
    expect(matchesPrefix("   ", "Crédit Agricole")).toBe(false);
  });
});
