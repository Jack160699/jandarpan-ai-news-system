/** Premium thin-line SVG icons for CG rates strip */

const stroke = "currentColor";

type IconProps = {
  className?: string;
};

export function GoldBarIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="5"
        y="9"
        width="14"
        height="6"
        rx="1"
        stroke={stroke}
        strokeWidth="1.25"
      />
      <path
        d="M7 11h10M8.5 13.5h7"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M12 6v3"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SilverCoinIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="6.5" stroke={stroke} strokeWidth="1.25" />
      <circle
        cx="12"
        cy="12"
        r="3.25"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M12 8.5v7M9.25 12h5.5"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function FxExchangeIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9h5.5a2.5 2.5 0 0 1 0 5H8"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 7.5 6 9l2 1.5M8 15.5 6 14l2-1.5"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 15h-5.5a2.5 2.5 0 0 1 0-5H16"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.5 18 15l-2-1.5M16 8.5 18 10l-2 1.5"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FuelStationIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="6"
        y="4"
        width="8"
        height="14"
        rx="1.25"
        stroke={stroke}
        strokeWidth="1.25"
      />
      <path
        d="M14 8h2.5a1.5 1.5 0 0 1 1.5 1.5V18"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M17.5 18h1.5"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <rect
        x="8.25"
        y="7"
        width="3.5"
        height="4.5"
        rx="0.5"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.55"
      />
      <path
        d="M8.5 15.5h3"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
