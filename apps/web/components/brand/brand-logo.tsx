import { cn } from "@/lib/utils";

/**
 * "iValeter" wordmark. The leading "i" is the orange accent; the rest is
 * slate-900 on light surfaces ("light") or white on dark ones ("dark").
 */
export function BrandLogo({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "font-heading font-black tracking-tight",
        variant === "dark" ? "text-white" : "text-slate-900",
        className,
      )}
    >
      <span className="text-orange-500">i</span>Valeter
    </span>
  );
}
