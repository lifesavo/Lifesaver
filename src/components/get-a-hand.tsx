import Link from "next/link";

/** Home card: sends people to the real Get a Hand request flow at /help. */
export function GetAHand({ zip }: { zip: string }) {
  return (
    <section aria-labelledby="hand-heading" className="rounded-3xl bg-ink px-4 py-4 text-white">
      <p id="hand-heading" className="font-serif text-2xl leading-tight">
        Need a hand fixing the mower? Tap once.
      </p>
      <p className="mt-1 text-sm text-white/75">
        A ride, small engines, repairs, yard work, heavy items, or roadside help near {zip}. Lend a
        Hand members nearby can accept your request.
      </p>
      <Link
        href="/help"
        className="mt-3 flex h-14 w-full items-center justify-center rounded-full bg-lime text-lg font-bold text-ink"
      >
        Get a Hand
      </Link>
    </section>
  );
}
