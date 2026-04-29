type CsvValue = string | number | boolean | null | undefined;

function csvEscape(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n\r;]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
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
  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
}

export function downloadHtmlPdf(filename: string, title: string, sections: Array<[string, string]>) {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 32px; color: #111827; }
    h1 { font-size: 24px; margin-bottom: 24px; }
    h2 { font-size: 13px; text-transform: uppercase; color: #6b7280; margin-top: 22px; }
    pre { white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
    .row { border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${sections
    .map(([label, value]) => `<div class="row"><h2>${label}</h2><pre>${value || "-"}</pre></div>`)
    .join("")}
  <script>window.print()</script>
</body>
</html>`;
  downloadTextFile(filename, html, "text/html;charset=utf-8");
}
