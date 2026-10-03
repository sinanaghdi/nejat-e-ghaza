const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function formatToman(value: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(value))} تومان`;
}

export function formatPickupTime(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
