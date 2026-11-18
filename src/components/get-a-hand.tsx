"use client";

import { useState } from "react";
import Link from "next/link";
import { Armchair, Hammer, Leaf, Truck, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "@/lib/money";
import { FOUNDING_HAND_LABEL, HAND_PRICE_LABEL } from "@/lib/pricing";
import { offersFor, type HelperOffer, type TaskCategory } from "@/lib/tasks";
import { useProfile } from "@/lib/profile";

const categories: { id: TaskCategory; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "engine", label: "Small engine", hint: "Fix a mower", icon: Wrench },
  { id: "repair", label: "Home repair", hint: "Minor fixes", icon: Hammer },
  { id: "yard", label: "Yard work", hint: "Mow or trim", icon: Leaf },
  { id: "moving", label: "Heavy items", hint: "Move a couch", icon: Truck },
  { id: "assembly", label: "Assembly", hint: "Build furniture", icon: Armchair },
];

const times = ["Today", "Tomorrow morning", "This weekend"];

export function GetAHand({ zip }: { zip: string }) {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [details, setDetails] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [whenLabel, setWhenLabel] = useState(times[0]);
  const [address, setAddress] = useState("");
  const [jobZip, setJobZip] = useState(zip);
  const [error, setError] = useState("");
  const [offers, setOffers] = useState<HelperOffer[] | null>(null);

  if (!profile) return null;
  const member = profile.plan === "hand";

  function start() {
    if (!member) {
      setUpgrade(true);
      return;
    }
    setOpen(true);
    setStep(0);
    setOffers(null);
    setError("");
  }

  function submit() {
    if (!category) return;
    if (details.trim().length < 8) {
      setError("Describe the job in a sentence.");
      return;
    }
    if (!/^\d{5}$/.test(jobZip)) {
      setError("Use a 5-digit ZIP code.");
      return;
    }
    setError("");
    setOffers(offersFor(category));
    setStep(3);
  }

  return (
    <section aria-labelledby="hand-heading" className="rounded-3xl bg-ink px-4 py-4 text-white">
      <p id="hand-heading" className="font-serif text-2xl leading-tight">
        Need a hand fixing the mower? Tap once.
      </p>
      <p className="mt-1 text-sm text-white/75">
        Small engines, minor repairs, yard work, heavy items, furniture. Included with Lend a Hand.
      </p>
      <Button type="button" onClick={start} className="mt-3 h-14 w-full rounded-full bg-lime text-lg font-bold text-ink hover:bg-lime/90">
        Get a Hand
      </Button>

      <Dialog open={upgrade} onOpenChange={setUpgrade}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-2xl">That is Lend a Hand.</DialogTitle>
            <DialogDescription>
              Get a Hand is included with Lend a Hand. Founding members lock {FOUNDING_HAND_LABEL}/mo for life.
              After launch it is {HAND_PRICE_LABEL}/mo. It includes everything in Premium. This demo does not charge a card.
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="h-12 rounded-full">
            <Link href="/pricing" onClick={() => setUpgrade(false)}>
              See Lend a Hand, {FOUNDING_HAND_LABEL} for life
            </Link>
          </Button>
        </DialogContent>
      </Dialog>

      {open && member && (
        <div className="mt-4 space-y-3 rounded-2xl bg-white p-3 text-ink">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">
            {step < 3 ? `Step ${step + 1} of 3` : "Sample offers"}
          </p>
          {step === 0 && (
            <>
              <h2 className="font-serif text-2xl">What do you need?</h2>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((item) => {
                  const Icon = item.icon;
                  const selected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      aria-pressed={selected}
                      className={`rounded-2xl border px-3 py-3 text-left ${
                        selected ? "border-ink bg-lime" : "border-ink/10 bg-muted"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      <span className="mt-1 block text-sm font-bold">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </button>
                  );
                })}
              </div>
              <Button type="button" className="h-12 w-full rounded-full" disabled={!category} onClick={() => setStep(1)}>
                Next
              </Button>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="font-serif text-2xl">Describe the job</h2>
              <Label htmlFor="hand-details">What is going on</Label>
              <textarea
                id="hand-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={3}
                placeholder="The mower starts, then dies after a minute."
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-base"
              />
              <Label htmlFor="hand-photo">Photo, optional</Label>
              <input
                id="hand-photo"
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setPhotoName(file.name);
                  const reader = new FileReader();
                  reader.onload = () => setPhotoUrl(typeof reader.result === "string" ? reader.result : "");
                  reader.readAsDataURL(file);
                }}
              />
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="The job you attached" className="h-28 w-full rounded-2xl object-cover" />
              )}
              <p className="text-xs text-muted-foreground">
                {photoName ? `${photoName} stays on this phone.` : "Nothing is uploaded in this demo."}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="button" className="h-12 flex-1 rounded-full" onClick={() => setStep(2)}>
                  Next
                </Button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="font-serif text-2xl">When and where</h2>
              <div className="flex flex-wrap gap-2">
                {times.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setWhenLabel(time)}
                    aria-pressed={whenLabel === time}
                    className={`h-10 rounded-full px-3 text-sm font-bold ${
                      whenLabel === time ? "bg-ink text-white" : "bg-muted"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <Label htmlFor="hand-address">Address, optional</Label>
              <Input id="hand-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Mission St" className="h-12 rounded-2xl" />
              <Label htmlFor="hand-zip">ZIP code</Label>
              <Input
                id="hand-zip"
                inputMode="numeric"
                maxLength={5}
                value={jobZip}
                onChange={(event) => setJobZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
                className="h-12 rounded-2xl"
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" className="h-12 flex-1 rounded-full" onClick={submit}>
                  See offers
                </Button>
              </div>
            </>
          )}
          {step === 3 && offers && category && (
            <div role="status">
              <h2 className="font-serif text-2xl">Sample offers</h2>
              <p className="text-sm text-muted-foreground">
                {whenLabel}
                {address ? ` · ${address}` : ""} · {jobZip}. These helpers are samples. Nobody was notified.
              </p>
              <ul className="mt-2 space-y-2">
                {offers.map((offer) => (
                  <li key={offer.id} className="rounded-2xl bg-muted px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{offer.name}</p>
                      <p className="font-serif text-xl">{money(offer.price)}</p>
                    </div>
                    <p className="text-sm">{offer.blurb}</p>
                    <p className="text-xs text-muted-foreground">
                      {offer.distance} · {offer.eta}
                    </p>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
