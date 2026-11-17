import { cn } from "cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M16 25.5c.2-5.2 3.6-7.4 3.6-11.2a3.6 3.6 0 0 0-7.2 0c0 3.8 3.4 6 3.6 11.2Z"
        fill="#F4F1E8"
      />
      <path
        d="M16 13.2c1.7.7 2.8 2 2.8 3.8"
        stroke="#E3C27A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  tone = "ink",
  compact = false,
}: {
  tone?: "ink" | "paper";
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", tone === "paper" && "text-primary-foreground")}>
      <Mark className={tone === "paper" ? "text-primary-foreground" : "text-primary"} />
      <span className="leading-none">
        <span
          className={cn(
            "block text-[0.65rem] font-semibold tracking-[0.14em] uppercase",
            tone === "paper" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          Your Money
        </span>
        <span className={cn("block font-serif tracking-tight", compact ? "text-base" : "text-lg")}>
          Life Saver
        </span>
      </span>
    </span>
  );
}
