import ExcelJS from "exceljs";
import Papa from "papaparse";

/**
 * Parsing client (lecture seule) d'un fichier d'import : CSV (délimiteur `;` ou
 * `,` auto-détecté, BOM toléré) ou XLSX. Renvoie les en-têtes et les lignes
 * indexées par en-tête. Cf. docs/adr/0002-import-contacts-dedup-et-fusion.md.
 */
export type ParsedFile = { headers: string[]; rows: Record<string, string>[] };

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXlsx(file);
  return parseCsv(file);
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((h) => h.length > 0);
        resolve({ headers, rows: res.data });
      },
      error: (err) => reject(err),
    });
  });
}

/** Valeur de cellule ExcelJS → chaîne plate (gère texte riche, formule, date, lien). */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    if ("text" in value && typeof value.text === "string") return value.text; // hyperlink
    if ("result" in value) return String(value.result ?? ""); // formule → résultat
    if ("richText" in value && Array.isArray(value.richText))
      return value.richText.map((t) => t.text).join("");
    return "";
  }
  return String(value);
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  // Row.values est indexé à partir de 1 (l'index 0 est vide).
  const headerCells = (sheet.getRow(1).values as ExcelJS.CellValue[]) ?? [];
  const headers = headerCells.slice(1).map((h) => cellToString(h).trim());
  if (headers.every((h) => h.length === 0)) return { headers: [], rows: [] };

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // en-têtes
    const cells = (row.values as ExcelJS.CellValue[]) ?? [];
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, i) => {
      if (h.length === 0) return;
      const val = cellToString(cells[i + 1]);
      record[h] = val;
      if (val.length > 0) hasValue = true;
    });
    if (hasValue) rows.push(record);
  });

  return { headers: headers.filter((h) => h.length > 0), rows };
}
