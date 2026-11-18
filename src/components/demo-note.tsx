/** Plain "Example" label for screens that show example numbers instead of the member's own data. */
export function ExampleTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full bg-sun px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink uppercase ${className}`}
    >
      Example
    </span>
  );
}

export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
      <ExampleTag className="mr-1.5 align-[1px]" />
      {children}
    </p>
  );
}
