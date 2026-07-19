import type { SVGProps } from "react";

/**
 * Reader Design System line-icon set (22px, stroke ~1.8, no emoji).
 * Names mirror the approved design token icon set.
 */

export type JdIconName =
  | "home"
  | "pin"
  | "bolt"
  | "headphone"
  | "search"
  | "user"
  | "bell"
  | "bookmark"
  | "share"
  | "play"
  | "more"
  | "clock"
  | "eye"
  | "download"
  | "wifiOff"
  | "wifi"
  | "globe"
  | "filter"
  | "fire"
  | "mic"
  | "rupee"
  | "lock"
  | "star"
  | "arrowL"
  | "chevR"
  | "chevD"
  | "refresh"
  | "close"
  | "rain"
  | "check"
  | "flag"
  | "pause"
  | "prev"
  | "next"
  | "list"
  | "plus"
  | "cog"
  | "sun"
  | "alert";

type JdIconProps = {
  name: JdIconName;
  size?: number;
  stroke?: number;
  color?: string;
} & Omit<SVGProps<SVGSVGElement>, "name" | "color" | "stroke">;

const PATHS: Record<JdIconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  headphone: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="7" rx="1.5" />
      <rect x="17" y="13" width="4" height="7" rx="1.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  share: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5-13-7.5Z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 19h16" />,
  wifiOff: (
    <>
      <path d="M3 3 21 21" />
      <path d="M8.5 12.5a6 6 0 0 1 7 0M5 9a11 11 0 0 1 4-2.3M19 9a11 11 0 0 0-6-2.9" />
      <path d="M11 16a2 2 0 0 1 2.4 0" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 9.5a11 11 0 0 1 14 0" />
      <path d="M8.5 13a6 6 0 0 1 7 0" />
      <path d="M11.5 16.5a2 2 0 0 1 1 0" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18-3-3.2-3-14.8 0-18Z" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" />,
  fire: (
    <path d="M12 3s5 3.5 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3 .4 1.4 1.6 2 1.6 2C9.5 8 12 3 12 3Z" />
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 12a6 6 0 0 0 12 0M12 18v3" />
    </>
  ),
  rupee: <path d="M7 4h10M7 8h10M7 8c6 0 6 6 0 6l7 7M7 8h3" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: (
    <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8L6.7 19.5l1-6L3.4 9.3l6-.9L12 3Z" />
  ),
  arrowL: <path d="M20 12H4m6-6-6 6 6 6" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </>
  ),
  close: <path d="M6 6 18 18M18 6 6 18" />,
  rain: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1 .7-9 5.5 5.5 0 0 1 10.6 1.4A3.6 3.6 0 0 1 17.5 15Z" />
      <path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 7" />,
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h10l-1.5 4L15 12H5" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  prev: <path d="M19 5v14L7 12l12-7Z" />,
  next: <path d="M5 5v14l12-7L5 5Z" />,
  list: (
    <>
      <path d="M8 7h12M8 12h12M8 17h12" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.5M17.5 16l1.6 1.5M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.5M17.5 8l1.6-1.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
};

export function JdIcon({
  name,
  size = 22,
  stroke = 1.8,
  color = "currentColor",
  ...rest
}: JdIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
