export function PhoneFrame({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#ffd0ea,_#efe4ff_45%,_#d9fff6)] sm:p-4">
      <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-background sm:h-[calc(100dvh-2rem)] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-2xl sm:ring-2 sm:ring-ink/10">
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
          {children}
        </div>
        {nav}
      </div>
    </div>
  );
}
