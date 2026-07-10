import {
  contactStage,
  interactionType,
  projectStatut,
  secteurEntreprise,
} from "@CRM-APP/backend/convex/lib/validators";
import { describe, expect, it } from "vitest";

import {
  INTERACTION_TYPES,
  SECTEURS,
  STAGES,
  STATUTS,
  interactionLabel,
  secteurLabel,
  stageBadgeClass,
  stageLabel,
  statutLabel,
} from "./crm";

/** Membres littéraux d'un validateur union Convex (`v.union(v.literal(...))`). */
function unionValues(u: { members: { value: string }[] }): string[] {
  return u.members.map((m) => m.value).sort();
}

describe("crm — alignement front ↔ back (source unique de vérité)", () => {
  it("STAGES couvre exactement le validateur contactStage", () => {
    expect(STAGES.map((s) => s.id).sort()).toEqual(unionValues(contactStage));
  });
  it("STATUTS couvre exactement le validateur projectStatut", () => {
    expect(STATUTS.map((s) => s.id).sort()).toEqual(unionValues(projectStatut));
  });
  it("SECTEURS couvre exactement le validateur secteurEntreprise", () => {
    expect(SECTEURS.map((s) => s.id).sort()).toEqual(unionValues(secteurEntreprise));
  });
  it("INTERACTION_TYPES couvre exactement le validateur interactionType", () => {
    expect(INTERACTION_TYPES.map((t) => t.id).sort()).toEqual(unionValues(interactionType));
  });
});

describe("crm — libellés et fallbacks", () => {
  it("mappe les identifiants connus vers leur libellé", () => {
    expect(stageLabel("nouveau")).toBe("Prospect");
    expect(statutLabel("en_cours")).toBe("En cours");
    expect(secteurLabel("banque")).toBe("Banque");
    expect(interactionLabel("relance")).toBe("Relance");
  });
  it("secteur non renseigné → libellé explicite", () => {
    expect(secteurLabel(undefined)).toBe("Non renseigné");
  });
  it("stageBadgeClass renvoie une classe non vide pour un stage connu", () => {
    expect(stageBadgeClass("gagne")).toContain("emerald");
  });
});
