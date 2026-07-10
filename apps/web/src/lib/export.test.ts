import { describe, expect, it } from "vitest";

import { csvEscape } from "./export";

describe("csvEscape — injection de formule tableur", () => {
  it.each(["=1+1", "+331234", "-2", "@SUM(A1)", "\tX", "\rX"])(
    "neutralise %j par un apostrophe de tête",
    (raw) => {
      expect(csvEscape(raw).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
    },
  );

  it("laisse les valeurs ordinaires intactes", () => {
    expect(csvEscape("Jane Doe")).toBe("Jane Doe");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(null)).toBe("");
  });

  it("cite et double les guillemets comme avant", () => {
    expect(csvEscape('a"b;c')).toBe('"a""b;c"');
  });

  it("un numéro de téléphone avec + reste lisible après neutralisation", () => {
    expect(csvEscape("+33 6 12 34 56 78")).toBe("'+33 6 12 34 56 78");
  });
});
