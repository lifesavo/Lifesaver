"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-serif text-4xl tracking-tight">Something hiccuped.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The demo hit a snag. Your waitlist signups are still in the database.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
