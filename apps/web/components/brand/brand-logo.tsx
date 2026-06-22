import { cn } from "@/lib/utils";

/**
 * "iValeter" wordmark. The leading "i" is cyan, the rest white (or navy on light).
 */
export function BrandLogo({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight",
        dark ? "text-navy" : "text-white",
        className,
      )}
    >
      <span className="text-cyan">i</span>Valeter
    </span>
  );
}
