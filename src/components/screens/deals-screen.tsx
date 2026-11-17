"use client";

import { useState } from "react";
import { cn } from "cn";
import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dealCategories, deals, type Deal, type DealCategory } from "@/lib/demo-data";
import { areaLabel } from "@/lib/money";
import { PREMIUM_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

export function DealsScreen() {
  const { profile } = useProfile();
  const [filter, setFilter] = useState<"all" | DealCategory>("all");
  const [active, setActive] = useState<Deal | null>(null);
  const [noted, setNoted] = useState<string | null>(null);

  if (!profile) return null;

  const cheapest = deals.find((deal) => deal.id === "costco-gas");
  const showCheapest = (filter === "all" || filter === "gas") && Boolean(cheapest);
  const visible = deals.filter((deal) => {
    if (filter !== "all" && deal.category !== filter) return false;
    if (showCheapest && deal.id === "costco-gas") return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Daily deals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Around {areaLabel(profile.zip)}
          </p>
        </div>
        <PlanChip />
      </header>
      <DemoNote>
        Not live prices. Store names are a San Francisco sample
        {profile.zip === "94110" ? " for 94110." : `, shown for ZIP ${profile.zip}.`} Free includes a
        few deals a day. Every deal is part of Premium ({PREMIUM_PRICE_LABEL}/mo). You can open the
        full sample either way.
      </DemoNote>

      <div
        role="radiogroup"
        aria-label="Deal category"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {dealCategories.map((category) => {
          const selected = filter === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(category.id)}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {showCheapest && cheapest && (
        <button
          type="button"
          onClick={() => setActive(cheapest)}
          className="w-full rounded-3xl bg-primary px-4 py-4 text-left text-primary-foreground"
        >
          <p className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
            Cheapest gas near you
          </p>
          <p className="mt-1 font-serif text-3xl">{cheapest.priceLabel}</p>
          <p className="mt-1 text-sm text-primary-foreground/85">
            {cheapest.merchant} · {cheapest.distance} · {cheapest.savingsLabel}
          </p>
        </button>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-6 text-sm" role="status">
          Nothing in this category. Try another filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((deal) => (
            <li key={deal.id}>
              <article className="rounded-3xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{deal.category}</p>
                    <h2 className="font-medium">{deal.merchant}</h2>
                    <p className="text-sm text-muted-foreground">{deal.title}</p>
                  </div>
                  <p className="text-right font-serif text-2xl leading-none">{deal.priceLabel}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{deal.savingsLabel}</Badge>
                  <Badge variant="outline">{deal.distance}</Badge>
                  <Badge variant="outline">
                    {deal.tier === "free" ? "On the free on-ramp" : "Premium"}
                  </Badge>
                  {deal.highlight && <Badge>{deal.highlight}</Badge>}
                </div>
                {deal.wasLabel && (
                  <p className="mt-2 text-sm text-muted-foreground">{deal.wasLabel}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">{deal.address}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-10 rounded-full"
                    onClick={() => {
                      setNoted(null);
                      setActive(deal);
                    }}
                  >
                    View deal
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(active)}
        onOpenChange={(next) => {
          if (!next) {
            setActive(null);
            setNoted(null);
          }
        }}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md">
          {active && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-serif text-2xl">{active.merchant}</DialogTitle>
                <DialogDescription>
                  {active.title} · {active.address} · {active.distance}
                </DialogDescription>
              </DialogHeader>
              <p className="font-serif text-4xl">{active.priceLabel}</p>
              <p className="text-sm text-muted-foreground">
                {active.wasLabel ? `${active.wasLabel}. ` : ""}
                {active.savingsLabel}. {active.detail}
              </p>
              <p className="text-sm text-muted-foreground">
                {active.tier === "free"
                  ? "This one is the kind of deal the free on-ramp would show."
                  : `The full board, including this deal, is included with Premium for ${PREMIUM_PRICE_LABEL}/mo.`}
              </p>
              {noted === active.id ? (
                <p className="rounded-2xl bg-secondary px-3 py-3 text-sm" role="status">
                  Saved to this demo. Directions would open here in the live app. No map was launched.
                </p>
              ) : (
                <Button
                  type="button"
                  className="h-12 rounded-full"
                  onClick={() => setNoted(active.id)}
                >
                  Save this spot
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
