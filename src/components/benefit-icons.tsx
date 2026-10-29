import type { ReactNode } from "react";

function CareIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function CottonComfort({ className = "" }: { className?: string }) {
  return (
    <CareIcon className={className}>
      <path
        d="M11 25C4 25 3 16 9 14c-1-7 8-10 12-5 6-4 12 1 11 6 7 4 3 12-3 11"
        fill="#F8E4DF"
        stroke="none"
      />
      <path d="M12 26c-7 0-9-10-2-12-1-7 8-11 12-5 6-4 12 1 10 7 7 3 3 12-4 11" />
      <path d="M20 34V23m0 7c-6 0-10-3-11-7 5-1 9 1 11 7Zm0 0c1-6 5-9 11-9-1 5-5 9-11 9Z" />
    </CareIcon>
  );
}

export function GrowingChoices({ className = "" }: { className?: string }) {
  return (
    <CareIcon className={className}>
      <path d="M20 24C18 13 23 7 32 5c1 10-3 17-12 19Z" fill="#F8E4DF" stroke="none" />
      <path d="M17 35c0-11 5-20 12-27M21 22C18 12 23 6 32 5c0 9-3 15-11 17Z" />
      <path d="M18 29C8 28 5 22 6 15c8 0 13 5 12 14Zm-7-9 7 9M25 15l5-1M24 34c4 0 7-2 9-5" />
    </CareIcon>
  );
}

export function EverydayFlow({ className = "" }: { className?: string }) {
  return (
    <CareIcon className={className}>
      <path d="M12 23a8 8 0 0 1 16 0" fill="#F8E4DF" stroke="none" />
      <path d="M12 22a8 8 0 0 1 16 0M20 6v4M8 11l3 3m21-3-3 3" />
      <path d="M5 24c6-6 11 6 18 0 4-3 7-3 12-1M5 31c6-6 11 6 18 0 4-3 7-3 12-1" />
    </CareIcon>
  );
}

export function ThoughtfulDetails({ className = "" }: { className?: string }) {
  return (
    <CareIcon className={className}>
      <path d="m8 13 12 7 12-7v18H8Z" fill="#F8E4DF" stroke="none" />
      <path d="M14 12H8v21h24V12h-6M8 16l12 7 12-7M20 23v10" />
      <path d="M20 16c-6-1-9-5-8-10 5 0 8 3 8 10Zm0 0c0-6 3-9 8-10 1 5-2 9-8 10Z" />
    </CareIcon>
  );
}
