const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function formatMontant(montant: number, devise = "EUR") {
  if (devise === "EUR") return eurFormatter.format(montant);
  return `${montant.toLocaleString("fr-FR")} ${devise}`;
}

export function formatDate(timestamp: number) {
  return dateFormatter.format(timestamp);
}

const OWNER_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
] as const;

export function ownerColor(ownerId: string): string {
  let hash = 0;
  for (let i = 0; i < ownerId.length; i++) {
    hash = (hash * 31 + ownerId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % OWNER_COLORS.length;
  return OWNER_COLORS[idx];
}

export function ownerInitials(ownerId: string): string {
  const cleaned = ownerId.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned.slice(0, 2) || "??").toUpperCase();
}
