import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">404</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">That page wandered off.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        That link is not a LifeSaver screen.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
      >
        Back to the start
      </Link>
    </div>
  );
}
