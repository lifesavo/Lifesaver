"use client";

import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";
import { detectPlatform, promptInstall, type Platform } from "./install-store";
import { useInstallState } from "./install-button";

const noop = () => () => {};

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-base leading-6">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallSteps() {
  const detected = useSyncExternalStore(noop, detectPlatform, () => "other" as Platform);
  const [picked, setPicked] = useState<Platform | null>(null);
  const platform = picked ?? (detected === "other" ? "ios" : detected);
  const { canPrompt, installed } = useInstallState();
  const [message, setMessage] = useState("");

  if (installed) {
    return (
      <p className="mt-6 flex items-center gap-2 rounded-2xl bg-lime px-4 py-3 font-bold text-ink" role="status">
        <Check className="size-5" aria-hidden="true" /> LifeSaver is on your home screen.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Your phone" className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            onClick={() => setPicked(p)}
            className={cn(
              "h-11 rounded-full text-sm font-bold",
              platform === p ? "bg-ink text-white" : "text-ink",
            )}
          >
            {p === "ios" ? "iPhone / iPad" : "Android"}
          </button>
        ))}
      </div>

      {platform === "ios" ? (
        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-serif text-2xl">iPhone or iPad</h2>
          <Steps
            items={[
              <>Open <b>golifesaver.com</b> in <b>Safari</b>.</>,
              <>Tap the <b>Share</b> button (the square with an arrow pointing up) at the bottom of the screen.</>,
              <>Scroll down and tap <b>Add to Home Screen</b>.</>,
              <>Tap <b>Add</b> in the top right. LifeSaver now sits on your home screen.</>,
            ]}
          />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Using Chrome on iPhone? Tap the Share button next to the address bar, then Add to Home Screen.
          </p>
        </section>
      ) : (
        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-serif text-2xl">Android</h2>
          {canPrompt ? (
            <button
              type="button"
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-lime font-bold text-ink shadow-[3px_3px_0_#14081f]"
              onClick={async () => {
                const result = await promptInstall();
                if (result === "dismissed") setMessage("No problem. Tap the button again any time.");
              }}
            >
              Install LifeSaver now
            </button>
          ) : null}
          <Steps
            items={[
              <>Open <b>golifesaver.com</b> in <b>Chrome</b>.</>,
              <>Tap <b>Install</b> when Chrome offers it, or tap the <b>⋮ menu</b> in the top right.</>,
              <>Choose <b>Install app</b> (or <b>Add to Home screen</b>).</>,
              <>Tap <b>Install</b>. LifeSaver shows up with your other apps.</>,
            ]}
          />
          {message ? (
            <p className="mt-3 text-sm" role="status">
              {message}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
