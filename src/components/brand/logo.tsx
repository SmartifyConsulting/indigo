import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * indigro mark: a teal rounded tile holding a stylised "i" (stem plus dot) whose dot is
 * lifted into an upward-pointing tick, a nod to growth and to a checked, compliant record.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 shrink-0", className)}
      role="img"
      aria-label={BRAND.name}
    >
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <rect x="13.5" y="13" width="5" height="12" rx="2.5" className="fill-navy" />
      <path d="M13 8.6 L16 5.6 L19 8.6 L16 11.6 Z" className="fill-navy" />
    </svg>
  );
}

export function Logo({
  className,
  onDark = false,
  size = "md",
}: {
  className?: string;
  onDark?: boolean;
  size?: "md" | "lg" | "hero";
}) {
  if (size === "hero") {
    // Sized in em from the wrapper font size, so the mark and wordmark scale together.
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[0.1em] text-[51px] sm:text-[77px] lg:text-[80px] xl:text-[106px]",
          className,
        )}
      >
        <LogoMark className="h-[1.33em] w-[1.33em]" />
        <span className={cn("wordmark leading-none", onDark ? "text-brand" : "text-navy")}>
          {BRAND.name}
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={size === "lg" ? "h-11 w-11" : "h-8 w-8"} />
      <span
        className={cn(
          "wordmark leading-none",
          size === "lg" ? "text-4xl" : "text-2xl",
          onDark ? "text-brand" : "text-navy",
        )}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
