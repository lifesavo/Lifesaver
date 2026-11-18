"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, MapPin } from "lucide-react";
import { HELP_DISCLAIMER, PRO_CATEGORIES, proCategory, URGENCY, type ProCategory } from "@/lib/help/types";
import { ago, issueEmoji, issueLabel, nearLink, type RoadsideRequestView, type Spot, useSpot } from "@/components/roadside/shared";
import { useProfile } from "@/lib/profile";

type Tab = "roadside" | "ride" | "pro";

function uberLink(dropoff: string, spot: Spot | null) {
  const p = new URLSearchParams({ action: "setPickup" });
  if (spot) {
    p.set("pickup[latitude]", spot.lat.toFixed(6));
    p.set("pickup[longitude]", spot.lng.toFixed(6));
  } else p.set("pickup", "my_location");
  if (dropoff) p.set("dropoff[formatted_address]", dropoff);
  return `https://m.uber.com/ul/?${p}`;
}

function lyftLink(spot: Spot | null) {
  const p = new URLSearchParams({ id: "lyft" });
  if (spot) {
    p.set("pickup[latitude]", spot.lat.toFixed(6));
    p.set("pickup[longitude]", spot.lng.toFixed(6));
  }
  return `https://lyft.com/ride?${p}`;
}

/** Shrinks a photo to about 900 px JPEG so it uploads fast on a phone. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let q = 0.8;
    let data = canvas.toDataURL("image/jpeg", q);
    while (data.length > 400_000 && q > 0.3) {
      q -= 0.15;
      data = canvas.toDataURL("image/jpeg", q);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function MyRequest({ r, onChange }: { r: RoadsideRequestView; onChange: (r: RoadsideRequestView) => void }) {
  async function act(action: "cancel" | "done") {
    const response = await fetch("/api/help/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, action }) });
    const data = (await response.json()) as { request?: RoadsideRequestView };
    if (data.request) onChange(data.request);
  }
  const live = (r.status === "open" && !r.expired) || r.status === "accepted";
  return (
    <li className={`rounded-3xl p-4 ${r.status === "accepted" ? "bg-lime" : r.status === "open" && !r.expired ? "bg-sun/70" : "bg-muted"} text-ink`} role="status" aria-live="polite">
      <p className="text-xs font-bold uppercase">
        {issueEmoji(r.issue, r.kind)} {issueLabel(r.issue, r.kind)} · {ago(r.createdAt)}
      </p>
      <p className="font-serif text-xl leading-tight">
        {r.status === "open" && !r.expired && "Waiting for a nearby helper…"}
        {r.status === "open" && r.expired && "No helper took this one."}
        {r.status === "accepted" && r.helper && `${r.helper.name} accepted.`}
        {r.status === "done" && "Done."}
        {r.status === "cancelled" && "Cancelled."}
      </p>
      {r.status === "accepted" && r.helper && (
        <div className="mt-2 flex gap-2">
          <a href={`tel:${r.helper.phone}`} className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white">Call {r.helper.name}</a>
          <a href={`sms:${r.helper.phone}`} className="inline-flex h-10 items-center rounded-full border-2 border-ink px-4 text-xs font-bold">Text</a>
        </div>
      )}
      {live && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => void act("done")} className="h-9 rounded-full bg-ink px-3 text-xs font-bold text-white">All set</button>
          <button type="button" onClick={() => void act("cancel")} className="h-9 rounded-full border-2 border-ink px-3 text-xs font-bold">Cancel</button>
        </div>
      )}
    </li>
  );
}

export function HelpScreen() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const initialTab = (["roadside", "ride", "pro"].includes(params.get("type") ?? "") ? params.get("type") : "pro") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const { spot, status, locate } = useSpot();
  const [zip, setZip] = useState(profile?.zip ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState(params.get("dropoff") ?? "");
  const [when, setWhen] = useState("As soon as possible");
  const [riders, setRiders] = useState(1);
  const [category, setCategory] = useState<ProCategory>((PRO_CATEGORIES.some((c) => c.id === params.get("category")) ? params.get("category") : "handyman") as ProCategory);
  const [address, setAddress] = useState("");
  const [urgency, setUrgency] = useState<string>("today");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<RoadsideRequestView[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = (await (await fetch("/api/help/requests?mine=1")).json()) as { requests?: RoadsideRequestView[] };
      if (Array.isArray(data.requests)) setMine(data.requests.filter((r) => r.role === "requester"));
    } catch {
      /* keep */
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  const anyLive = mine.some((r) => (r.status === "open" && !r.expired) || r.status === "accepted");
  useEffect(() => {
    if (!anyLive) return;
    const t = setInterval(() => void refresh(), 10000);
    return () => clearInterval(t);
  }, [anyLive, refresh]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const body: Record<string, unknown> = { type: tab, name, phone, ...(spot ? { lat: spot.lat, lng: spot.lng } : { zip }) };
      if (tab === "ride") Object.assign(body, { pickup, dropoff, when, riders, note: description });
      if (tab === "pro") Object.assign(body, { category, address, urgency, description, photo });
      const response = await fetch("/api/help/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json()) as { ok?: boolean; message?: string; request?: RoadsideRequestView };
      if (!response.ok || !data.request) throw new Error(data.message || "Could not send the request.");
      setMine((current) => [data.request!, ...current]);
      setDescription("");
      setPhoto(null);
      setTimeout(() => document.getElementById("my-requests")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the request.");
    } finally {
      setSending(false);
    }
  }

  const cat = proCategory(category);

  return (
    <div className="space-y-4 pb-24">
      <header className="rounded-3xl bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-5 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Get a Hand</p>
        <h1 className="font-serif text-4xl leading-none">Help from people nearby</h1>
        <p className="mt-2 text-sm text-white/85">A ride, a hand at home, or help on the road. Nearby Lend a Hand members can accept, and you&apos;ll see when they do.</p>
      </header>

      {mine.length > 0 && (
        <section id="my-requests" className="space-y-2">
          <h2 className="font-serif text-2xl">Your requests</h2>
          <ul className="space-y-2">
            {mine.slice(0, 5).map((r) => (
              <MyRequest key={r.id} r={r} onChange={(next) => setMine((c) => c.map((x) => (x.id === next.id ? next : x)))} />
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-3 gap-2" role="tablist">
        {([
          ["roadside", "🛞", "Roadside"],
          ["ride", "🚙", "Ride"],
          ["pro", "🔧", "Home & pro"],
        ] as const).map(([id, emoji, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-2xl px-2 py-3 text-sm font-bold ${tab === id ? (id === "roadside" ? "bg-[#dc2626] text-white" : "bg-ink text-white") : "bg-muted"}`}>
            <span className="block text-2xl">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "roadside" && (
        <section className="space-y-2 rounded-3xl bg-[#dc2626] p-4 text-white">
          <h2 className="font-serif text-2xl">Stuck on the road?</h2>
          <p className="text-sm">Flat tire, breakdown, out of gas, locked out, dead battery, or an accident. Roadside Help has safety steps, your location, tow links, and nearby helpers.</p>
          <Link href="/roadside" className="flex h-12 items-center justify-center rounded-full bg-white text-base font-bold text-[#dc2626]">Open Roadside Help</Link>
          <a href="tel:911" className="block text-center text-sm font-bold underline">In danger? Call 911</a>
        </section>
      )}

      {tab !== "roadside" && (
        <form className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4" onSubmit={submit}>
          {tab === "ride" && (
            <>
              <h2 className="font-serif text-2xl">Ask for a ride</h2>
              <div>
                <label htmlFor="h-pickup" className="text-sm font-medium">Pickup address</label>
                <input id="h-pickup" required value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="160 Hwy 224, Lexington, MO" className="h-12 w-full rounded-2xl border px-3 text-base" />
                <p className="text-xs text-muted-foreground">Only the helper who accepts sees your pickup address.</p>
              </div>
              <div>
                <label htmlFor="h-dropoff" className="text-sm font-medium">Drop-off</label>
                <input id="h-dropoff" required value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Kansas City airport" className="h-12 w-full rounded-2xl border px-3 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="h-when" className="text-sm font-medium">When</label>
                  <input id="h-when" value={when} onChange={(e) => setWhen(e.target.value)} className="h-12 w-full rounded-2xl border px-3 text-base" />
                </div>
                <div>
                  <label htmlFor="h-riders" className="text-sm font-medium">Riders</label>
                  <input id="h-riders" inputMode="numeric" value={String(riders)} onChange={(e) => setRiders(Math.min(8, Number(e.target.value.replace(/\D/g, "")) || 1))} className="h-12 w-full rounded-2xl border px-3 text-base" />
                </div>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-sm">
                <p className="font-semibold">Need it now? Compare the apps too</p>
                <div className="mt-2 flex gap-2">
                  <a href={uberLink(dropoff, spot)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-black px-4 text-xs font-bold text-white">Open Uber</a>
                  <a href={lyftLink(spot)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-[#ff00bf] px-4 text-xs font-bold text-white">Open Lyft</a>
                  <Link href="/rides" className="inline-flex h-10 items-center rounded-full border-2 border-ink px-4 text-xs font-bold">Compare</Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">LifeSaver isn&apos;t an Uber or Lyft partner. Prices are in their apps.</p>
              </div>
            </>
          )}

          {tab === "pro" && (
            <>
              <h2 className="font-serif text-2xl">Help at home or work</h2>
              <div className="grid grid-cols-3 gap-2">
                {PRO_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={`rounded-2xl px-1 py-2 text-xs font-bold ${category === c.id ? "bg-ink text-white" : "bg-muted"}`}>
                    <span className="block text-xl">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="h-desc" className="text-sm font-medium">What do you need?</label>
                <textarea id="h-desc" required rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={`e.g. ${category === "plumber" ? "Kitchen sink is leaking under the cabinet." : category === "lawn_snow" ? "Shovel the driveway and front walk." : "Mount a TV and hang two shelves."}`} className="w-full rounded-2xl border px-3 py-2 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="h-address" className="text-sm font-medium">Address (optional)</label>
                  <input id="h-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="h-12 w-full rounded-2xl border px-3 text-base" />
                </div>
                <div>
                  <label htmlFor="h-urgency" className="text-sm font-medium">How soon</label>
                  <select id="h-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} className="h-12 w-full rounded-2xl border bg-white px-3 text-base">
                    {URGENCY.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Only the helper who accepts sees your address.</p>
              <div>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-4 text-sm font-bold">
                  <Camera className="size-4" aria-hidden="true" /> {photo ? "Change photo" : "Add a photo (optional)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void shrink(file).then(setPhoto).catch(() => setError("That photo couldn't be read."));
                    }}
                  />
                </label>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Your photo" className="mt-2 max-h-40 rounded-2xl" />
                )}
                <p className="text-xs text-muted-foreground">Only you and the helper who accepts your request can see the photo.</p>
              </div>
              <div className="rounded-2xl bg-cyan/60 p-3 text-sm text-ink">
                <p className="font-semibold">Want a licensed pro?</p>
                <a href={nearLink(cat.search, spot)} target="_blank" rel="noreferrer" className="mt-1 inline-flex h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white">
                  Find nearby {cat.label.toLowerCase()} on Google Maps
                </a>
                <p className="mt-1 text-xs">For electrical, gas, plumbing, HVAC, or roofing work, check the license and insurance before you hire.</p>
              </div>
            </>
          )}

          <div className="rounded-2xl border p-3 text-sm">
            <p className="flex items-center gap-1 font-semibold"><MapPin className="size-4" aria-hidden="true" /> Location</p>
            {spot ? (
              <p className="text-muted-foreground">Using your current location (helpers see only the approximate area).</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{status}</p>
                <div className="mt-1 flex gap-2">
                  <input aria-label="ZIP or city" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP or City, ST" className="h-11 min-w-0 flex-1 rounded-2xl border px-3 text-base" />
                  <button type="button" onClick={locate} className="h-11 rounded-full bg-muted px-3 text-xs font-bold">Use my location</button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="h-name" className="text-sm font-medium">First name</label>
              <input id="h-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" className="h-12 w-full rounded-2xl border px-3 text-base" />
            </div>
            <div>
              <label htmlFor="h-phone" className="text-sm font-medium">Phone</label>
              <input id="h-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-12 w-full rounded-2xl border px-3 text-base" />
            </div>
          </div>
          {tab === "ride" && (
            <div>
              <label htmlFor="h-note" className="text-sm font-medium">Note (optional)</label>
              <input id="h-note" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Two bags, one car seat" className="h-12 w-full rounded-2xl border px-3 text-base" />
            </div>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <button type="submit" disabled={sending} className="h-12 w-full rounded-full bg-primary text-base font-bold text-primary-foreground">
            {sending ? "Sending…" : "Ask nearby Lend a Hand helpers"}
          </button>
          <p className="text-xs text-muted-foreground">{HELP_DISCLAIMER} Agree on any payment directly with your helper.</p>
        </form>
      )}

      <Link href="/helpers" className="block rounded-2xl bg-lime px-4 py-3 text-sm font-bold text-ink">Lend a Hand member? See requests near you and earn</Link>
      <Link href="/home" className="block text-center text-sm font-semibold text-primary">Back to LifeSaver</Link>
    </div>
  );
}
