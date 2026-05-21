import { cn } from "@/lib/cn";

type RuleProps = {
  className?: string;
  weight?: "hairline" | "medium" | "heavy";
};

export function Rule({ className, weight = "hairline" }: RuleProps) {
  return (
    <hr
      className={cn(
        "rule border-0",
        weight === "hairline" && "rule-hairline",
        weight === "medium" && "rule-medium",
        weight === "heavy" && "rule-heavy",
        className
      )}
    />
  );
}
