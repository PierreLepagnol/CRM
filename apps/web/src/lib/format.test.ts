import { describe, expect, it } from "vitest";

import { formatDate, formatEuros } from "./format";

describe("formatEuros", () => {
  it("formate en euros sans décimales", () => {
    // Espace insécable étroit dans la locale fr-FR ; on teste les composantes.
    const out = formatEuros(1234);
    expect(out).toMatch(/1\s?234/);
    expect(out).toContain("€");
    expect(out).not.toMatch(/,\d/); // pas de décimales
  });
  it("gère zéro", () => {
    expect(formatEuros(0)).toContain("0");
  });
});

describe("formatDate", () => {
  it("formate un timestamp en jj/mm/aa (fr-FR)", () => {
    // 2026-05-04T00:00:00Z
    const ts = Date.UTC(2026, 4, 4);
    expect(formatDate(ts)).toMatch(/^\d{2}\/\d{2}\/\d{2}$/);
  });
});
