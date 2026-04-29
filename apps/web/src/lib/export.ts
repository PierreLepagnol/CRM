type CsvValue = string | number | boolean | null | undefined;

function csvEscape(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[";,\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Array<Record<string, CsvValue>>) {
  if (rows.length === 0) {
    downloadTextFile(filename, "", "text/csv;charset=utf-8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(";"),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";")),
  ].join("\r\n");
  // BOM for French Excel
  downloadTextFile(filename, "﻿" + csv, "text/csv;charset=utf-8");
}
