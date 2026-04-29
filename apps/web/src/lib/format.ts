const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function formatDate(timestamp: number) {
  return dateFormatter.format(timestamp);
}
