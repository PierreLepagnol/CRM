const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatDate(timestamp: number) {
  return dateFormatter.format(timestamp);
}

export function formatEuros(amount: number) {
  return euroFormatter.format(amount);
}
