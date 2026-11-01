import type { ReactNode } from "react";

export type UiIconName =
  | "search"
  | "pin"
  | "bag"
  | "home"
  | "food"
  | "package"
  | "store"
  | "clock"
  | "leaf"
  | "arrow-left"
  | "shield-check"
  | "check"
  | "calendar"
  | "user"
  | "wallet"
  | "bell"
  | "ticket"
  | "star"
  | "close";

const paths: Record<UiIconName, ReactNode> = {
  search: <><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.2 4.2" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  food: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 3v18M16 3c3 2 4 5 4 8h-4" /></>,
  package: <><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="m3.5 8.2 8.5 4.7 8.5-4.7M12 13v8" /></>,
  store: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6" /><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-5h6v5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  leaf: <><path d="M20 4C11 4 5 7 5 14a6 6 0 0 0 6 6c7 0 9-7 9-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
  "arrow-left": <><path d="M19 12H5" /><path d="m12 5-7 7 7 7" /></>,
  "shield-check": <><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 9h18M16 15h2" /><path d="M3 6V4a1 1 0 0 1 1-1h14" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  ticket: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" /><path d="M12 7v2m0 2v2m0 2v2" /></>,
  star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
};

type Props = {
  name: UiIconName;
  size?: number;
  className?: string;
};

export function UiIcon({ name, size = 20, className }: Props) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
