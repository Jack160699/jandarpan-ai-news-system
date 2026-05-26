type TeamAvatarProps = {
  name: string;
  email: string;
  hue: number;
  size?: "sm" | "md" | "lg";
};

const SIZES = { sm: 28, md: 36, lg: 48 };

export function TeamAvatar({ name, email, hue, size = "md" }: TeamAvatarProps) {
  const px = SIZES[size];
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : (parts[0]?.slice(0, 2) ?? email.slice(0, 2)).toUpperCase();

  return (
    <span
      className={`anr-team-avatar anr-team-avatar--${size}`}
      style={{
        width: px,
        height: px,
        background: `hsl(${hue} 62% 42%)`,
        boxShadow: `0 0 0 1px hsl(${hue} 62% 28% / 0.4)`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
