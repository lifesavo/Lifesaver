import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { InstallSteps } from "@/components/pwa/install-steps";

export const metadata: Metadata = {
  title: "Get the app",
  description: "Put LifeSaver on your phone's home screen in a few taps. iPhone and Android.",
};

export default function InstallPage() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-5 pt-6 pb-32">
      <Link href="/" aria-label="LifeSaver home">
        <Wordmark compact />
      </Link>
      <h1 className="mt-8 font-serif text-4xl leading-[1.05] tracking-tight">Get the LifeSaver app</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        No app store needed. Add LifeSaver to your home screen and it opens full screen, just like any other app.
      </p>
      <InstallSteps />
      <Link
        href="/start"
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full border-2 border-ink/15 font-bold"
      >
        Skip for now, open LifeSaver
      </Link>
    </div>
  );
}
