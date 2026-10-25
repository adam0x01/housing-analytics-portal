export function number(
  value: number | null | undefined,
  maximumFractionDigits = 0,
) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

export function featureNumber(name: string, value: number, fractionDigits = 2) {
  return name === "year_built" ? String(value) : number(value, fractionDigits);
}

export function date(value: string) {
  return new Intl.DateTimeFormat("en-HK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

export const featureLabels: Record<string, string> = {
  square_footage: "Floor area",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  year_built: "Year built",
  lot_size: "Lot size",
  distance_to_city_center: "Distance to centre",
  school_rating: "School rating",
};
