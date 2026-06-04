import { describe, expect, it } from "vitest";

import { buildContactCsvRows } from "./contact-export";

type PartialContact = Parameters<typeof buildContactCsvRows>[0][number];

const baseContact = (over: Partial<PartialContact>): PartialContact =>
  ({
    _id: "c1",
    prenom: "Jean",
    nom: "Dupont",
    stage: "nouveau",
    ...over,
  }) as PartialContact;

describe("buildContactCsvRows", () => {
  const resolveName = (id: string) =>
    ({ u1: "Alice Martin", u2: "Bob Durand", u3: "Cara Lopez" })[id];

  it("exports the owner name resolved from owner_id", () => {
    const rows = buildContactCsvRows(
      [baseContact({ owner_id: "u1" })],
      resolveName,
    );
    expect(rows[0]["Propriétaire"]).toBe("Alice Martin");
  });

  it("joins multiple responsibles by name", () => {
    const rows = buildContactCsvRows(
      [baseContact({ responsible_ids: ["u2", "u3"] })],
      resolveName,
    );
    expect(rows[0]["Responsables"]).toBe("Bob Durand, Cara Lopez");
  });

  it("leaves owner empty when there is no owner_id", () => {
    const rows = buildContactCsvRows([baseContact({})], resolveName);
    expect(rows[0]["Propriétaire"]).toBe("");
  });

  it("no longer emits the deprecated Contact SCIAM column", () => {
    const rows = buildContactCsvRows([baseContact({})], resolveName);
    expect("Contact SCIAM" in rows[0]).toBe(false);
  });

  it("exporte le nom de l'entreprise liée plutôt que le texte legacy", () => {
    const rows = buildContactCsvRows(
      [baseContact({ entreprise: "credit agricole", entreprise_nom: "Crédit Agricole CIB" })],
      resolveName,
    );
    expect(rows[0]["Entreprise"]).toBe("Crédit Agricole CIB");
  });

  it("retombe sur le texte legacy quand aucune entreprise n'est liée", () => {
    const rows = buildContactCsvRows([baseContact({ entreprise: "Generali" })], resolveName);
    expect(rows[0]["Entreprise"]).toBe("Generali");
  });

  it("exporte l'URL du profil LinkedIn dans une colonne dédiée", () => {
    const rows = buildContactCsvRows(
      [baseContact({ linkedin_url: "https://www.linkedin.com/in/jean-dupont/" })],
      resolveName,
    );
    expect(rows[0]["Profil LinkedIn"]).toBe("https://www.linkedin.com/in/jean-dupont/");
  });

  it("laisse la colonne Profil LinkedIn vide quand le contact n'en a pas", () => {
    const rows = buildContactCsvRows([baseContact({})], resolveName);
    expect(rows[0]["Profil LinkedIn"]).toBe("");
  });
});
