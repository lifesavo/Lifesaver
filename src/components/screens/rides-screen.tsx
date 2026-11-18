"use client";

import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { Badge } from "@/components/ui/badge";
import { cheapest, deliveryOptions, rideOptions, sampleTrip } from "@/lib/rides";
import { money } from "@/lib/money";
import { areaLabel } from "@/lib/money";
import { useProfile } from "@/lib/profile";

export function RidesScreen() {
  const { profile } = useProfile();
  if (!profile) return null;
  const cheapRide = cheapest(rideOptions);
  const cheapDelivery = cheapest(deliveryOptions);
  const rideGap = Math.max(...rideOptions.map((option) => option.price)) - cheapRide.price;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Rides & delivery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sampleTrip.fromLabel} in {areaLabel(profile.zip)} to {sampleTrip.toLabel}
          </p>
        </div>
        <PlanChip />
      </header>
      <DemoNote>
        Estimated fares, not live quotes. Buttons open Uber, Lyft, Uber Eats, or DoorDash on their own
        sites. LifeSaver is not their partner and does not book the ride.
      </DemoNote>

      <section aria-labelledby="rides-heading" className="space-y-2">
        <h2 id="rides-heading" className="font-serif text-2xl">Rides</h2>
        <p className="rounded-2xl bg-lime px-4 py-3 text-sm font-semibold text-ink">
          Cheapest estimate: {cheapRide.name} at {money(cheapRide.price)}. About {money(rideGap)}{" "}
          under the other one. Fares move, so check both apps.
        </p>
        <ul className="space-y-2">
          {rideOptions.map((option) => (
            <li key={option.id} className="rounded-3xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{option.name}</p>
                  <p className="text-sm text-muted-foreground">{option.detail}</p>
                </div>
                <p className="font-serif text-2xl">{money(option.price)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {option.id === cheapRide.id && <Badge>Cheapest estimate</Badge>}
                <a
                  href={option.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white"
                >
                  Open {option.name}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="delivery-heading" className="space-y-2">
        <h2 id="delivery-heading" className="font-serif text-2xl">Delivery</h2>
        <p className="text-sm text-muted-foreground">
          {cheapDelivery.name} has the lower estimated fee at {money(cheapDelivery.price)}.
        </p>
        <ul className="space-y-2">
          {deliveryOptions.map((option) => (
            <li key={option.id} className="rounded-3xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{option.name}</p>
                  <p className="text-sm text-muted-foreground">{option.detail}</p>
                </div>
                <p className="font-serif text-2xl">{money(option.price)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {option.id === cheapDelivery.id && <Badge className="bg-lime text-ink">Lower estimated fee</Badge>}
                <a
                  href={option.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                  Open {option.name}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
