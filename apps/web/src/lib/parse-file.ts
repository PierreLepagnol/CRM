import Papa from "papaparse";
import * as XLSX from "xlsx";

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

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (matrix.length === 0) return { headers: [], rows: [] };
  const headers = (matrix[0] as unknown[]).map((h) => String(h ?? "").trim());
  const rows = matrix.slice(1).map((arr) => {
    const cells = arr as unknown[];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h.length > 0) row[h] = String(cells[i] ?? "");
    });
    return row;
  });
  return { headers: headers.filter((h) => h.length > 0), rows };
}
