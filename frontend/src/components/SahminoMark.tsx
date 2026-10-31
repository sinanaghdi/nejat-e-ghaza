type Props = { className?: string };

/** Sahmino's standalone S / circular-food / leaf brand mark. */
export function SahminoMark({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M46.8 13.2A24 24 0 1 0 55.5 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M20 23.5c4.2-6.1 15.8-7.5 22.1-2.1 3.5 3 2.8 7.6-1.5 10.1-3.2 1.9-9.2 2.5-13.3 4.1-5.5 2.1-5.8 7.2-1.7 10.1 5.2 3.7 14.2 2.3 19-2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42.2 8.4c5.8-.2 10.5 2.2 13.4 6.6-5.7 1.6-10.9.3-14.1-3.4"
        fill="#E9A44B"
      />
      <path d="M44.8 11.7c2.2.9 4.4 2.1 6.2 3.5" fill="none" stroke="#C9832A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
