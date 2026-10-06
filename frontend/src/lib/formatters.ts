const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function formatToman(value: string | number): string {
  const numericValue = Number(value);
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(numericValue))} تومان`;
}

export function formatPickupTime(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


export function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
