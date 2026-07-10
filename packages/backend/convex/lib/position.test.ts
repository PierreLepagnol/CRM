import { describe, expect, it } from "vitest";

import { MIN_GAP, movesFromPlan, needsRebalance, planMove, positionBetween } from "./position";

describe("positionBetween", () => {
  it("liste vide → 0", () => {
    expect(positionBetween(undefined, undefined)).toBe(0);
  });
  it("début de colonne → after - 1", () => {
    expect(positionBetween(undefined, 5)).toBe(4);
  });
  it("fin de colonne → before + 1", () => {
    expect(positionBetween(5, undefined)).toBe(6);
  });
  it("entre deux voisins → moyenne", () => {
    expect(positionBetween(2, 4)).toBe(3);
    expect(positionBetween(0, 1)).toBe(0.5);
  });
});

describe("needsRebalance", () => {
  it("faux aux extrémités (pas de voisin des deux côtés)", () => {
    expect(needsRebalance([1, 2, 3], 0)).toBe(false);
    expect(needsRebalance([1, 2, 3], 3)).toBe(false);
  });
  it("faux quand l'écart est confortable", () => {
    expect(needsRebalance([0, 1, 2], 1)).toBe(false);
  });
  it("vrai quand les voisins ont convergé", () => {
    expect(needsRebalance([0, MIN_GAP / 2, 1], 1)).toBe(true);
  });
});

describe("planMove", () => {
  const others = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  it("insère en une seule écriture au milieu", () => {
    const plan = planMove(others, 1);
    expect(plan).toEqual({ kind: "single", position: 0.5 });
  });

  it("insère en fin de colonne (une écriture)", () => {
    expect(planMove(others, 3)).toEqual({ kind: "single", position: 3 });
  });

  it("insère en tête (une écriture)", () => {
    expect(planMove(others, 0)).toEqual({ kind: "single", position: -1 });
  });

  it("borne un index hors plage", () => {
    expect(planMove(others, 99)).toEqual({ kind: "single", position: 3 });
    expect(planMove(others, -5)).toEqual({ kind: "single", position: -1 });
  });

  it("rééquilibre quand les positions ont convergé", () => {
    const tight = [
      { id: "a", position: 0 },
      { id: "b", position: MIN_GAP / 2 },
    ];
    const plan = planMove(tight, 1);
    expect(plan.kind).toBe("rebalance");
    if (plan.kind === "rebalance") {
      // a, moved, b réindexés en 0,1,2
      expect(plan.positions).toEqual([
        { id: "a", position: 0 },
        { id: "__moved__", position: 1 },
        { id: "b", position: 2 },
      ]);
    }
  });
});

describe("movesFromPlan (traducteur partagé plan → écritures)", () => {
  const others = [
    { id: "a", position: 0 },
    { id: "b", position: 2 },
  ];

  it("déplacement simple → une seule écriture sur l'élément déplacé", () => {
    const writes = movesFromPlan(others, 1, "moved", "stage", "rdv", 42);
    expect(writes).toEqual([
      { id: "moved", patch: { stage: "rdv", position: 1, updated_at: 42 } },
    ]);
  });

  it("générique sur le nom de colonne (statut)", () => {
    const writes = movesFromPlan(others, 2, "moved", "statut", "termine", 7);
    expect(writes).toEqual([
      { id: "moved", patch: { statut: "termine", position: 3, updated_at: 7 } },
    ]);
  });

  it("rééquilibrage → écritures pour tous, colonne seulement sur le déplacé", () => {
    const tight = [
      { id: "a", position: 0 },
      { id: "b", position: MIN_GAP / 2 },
    ];
    const writes = movesFromPlan(tight, 1, "moved", "stage", "gagne", 9);
    expect(writes).toEqual([
      { id: "a", patch: { position: 0, updated_at: 9 } },
      { id: "moved", patch: { stage: "gagne", position: 1, updated_at: 9 } },
      { id: "b", patch: { position: 2, updated_at: 9 } },
    ]);
  });
});
