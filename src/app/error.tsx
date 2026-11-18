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
        LifeSaver hit a snag loading this screen. Your account and sign-ups are safe.
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
