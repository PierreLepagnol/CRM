import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { parseImportFile } from "./parse-file";

/**
 * Régression du remplacement de `xlsx` (CVE non corrigées) par `exceljs` : le
 * parsing XLSX doit rester équivalent (en-têtes trimés, lignes indexées par
 * en-tête, lignes vides ignorées, colonnes sans en-tête ignorées).
 */
async function xlsxFile(rows: (string | number)[][]): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feuille1");
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], "contacts.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseImportFile — XLSX via exceljs", () => {
  it("extrait en-têtes et lignes indexées", async () => {
    const file = await xlsxFile([
      [" Prénom ", "Nom", "Email"],
      ["Karima", "Belamri", "k@example.com"],
      ["Yann", "Nadjar", ""],
    ]);
    const { headers, rows } = await parseImportFile(file);
    expect(headers).toEqual(["Prénom", "Nom", "Email"]);
    expect(rows).toEqual([
      { Prénom: "Karima", Nom: "Belamri", Email: "k@example.com" },
      { Prénom: "Yann", Nom: "Nadjar", Email: "" },
    ]);
  });

  it("ignore les lignes entièrement vides", async () => {
    const file = await xlsxFile([
      ["Nom"],
      ["Doe"],
      ["", ""],
    ]);
    const { rows } = await parseImportFile(file);
    expect(rows).toEqual([{ Nom: "Doe" }]);
  });

  it("parse aussi le CSV (délimiteur ;)", async () => {
    const csv = new File(["Nom;Email\r\nDoe;d@x.fr\r\n"], "c.csv", { type: "text/csv" });
    const { headers, rows } = await parseImportFile(csv);
    expect(headers).toEqual(["Nom", "Email"]);
    expect(rows).toEqual([{ Nom: "Doe", Email: "d@x.fr" }]);
  });
});
