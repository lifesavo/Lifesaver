export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
      <span className="font-semibold text-foreground">Sample data. </span>
      {children}
    </p>
  );
}
