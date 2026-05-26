import { motion } from "framer-motion";

type ActionButtonVariant = "primary" | "danger" | "ghost" | "default";

type ActionButtonProps = {
  children: React.ReactNode;
  variant?: ActionButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  ariaLabel?: string;
};

export function ActionButton({
  children,
  variant = "default",
  disabled,
  onClick,
  type = "button",
  className,
  ariaLabel,
}: ActionButtonProps) {
  const tone =
    variant === "default" ? "" : variant === "primary" ? " anr-btn--primary" : variant === "danger" ? " anr-btn--danger" : " anr-btn--ghost";
  return (
    <motion.button
      type={type}
      className={`anr-btn${tone}${className ? ` ${className}` : ""}`}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}
