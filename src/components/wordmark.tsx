import { cn } from "cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="10" fill="#2A1038" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#FF3D8A" strokeWidth="4" />
      <circle cx="16" cy="16" r="3.2" fill="#D6FF4A" />
      <path d="M16 5.5v4.2M16 22.3v4.2M5.5 16h4.2M22.3 16h4.2" stroke="#2A1038" strokeWidth="2.2" strokeLinecap="round" />
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
    <span className={cn("inline-flex items-center gap-2", tone === "paper" && "text-white")}>
      <Mark />
      <span className={cn("font-serif leading-none tracking-tight", compact ? "text-xl" : "text-2xl")}>
        LifeSaver
      </span>
    </span>
  );
}
