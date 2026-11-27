"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2, Zap } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/money";

const STORE_KEY = "lifesaver.power.v1";

type Device = { id: string; name: string; watts: number; hours: number };

type Saved = {
  rate: string; // cents per kWh, as typed
  devices: Device[];
  doing: string[]; // tip ids
};

/** Typical wattages. Real devices vary, so people can edit the number. */
const PRESETS: { name: string; watts: number; hours: number }[] = [
  { name: "Space heater", watts: 1500, hours: 4 },
  { name: "Window AC", watts: 900, hours: 8 },
  { name: "Clothes dryer", watts: 3000, hours: 0.5 },
  { name: "Electric oven", watts: 2400, hours: 0.5 },
  { name: "Dishwasher", watts: 1500, hours: 1 },
  { name: "Refrigerator", watts: 150, hours: 24 },
  { name: "Gaming console", watts: 150, hours: 3 },
  { name: "TV", watts: 100, hours: 5 },
  { name: "Desktop computer", watts: 200, hours: 6 },
  { name: "Laptop", watts: 50, hours: 6 },
  { name: "Hair dryer", watts: 1500, hours: 0.2 },
  { name: "Old 60W bulb", watts: 60, hours: 5 },
  { name: "LED bulb", watts: 9, hours: 5 },
];

/** Rough yearly kWh a typical home saves with each habit. Estimates only; homes vary a lot. */
const TIPS: { id: string; title: string; how: string; kwh: number }[] = [
  { id: "led", title: "Swap 10 old bulbs for LEDs", how: "A 9W LED gives the same light as a 60W bulb. Start with the lights that stay on longest.", kwh: 550 },
  { id: "thermostat", title: "Turn the thermostat back 7–10°F while asleep or away", how: "8 hours a day of setback trims heating and cooling. Only counts if your heat or AC is electric.", kwh: 600 },
  { id: "cold", title: "Wash clothes in cold water", how: "Most of a washer's energy goes to heating water. Today's detergents clean fine in cold.", kwh: 250 },
  { id: "dryer", title: "Air-dry half your loads", how: "Use a rack or line for towels and jeans. Clean the lint screen every load either way.", kwh: 300 },
  { id: "waterheater", title: "Set the water heater to 120°F", how: "Many ship at 140°F. Only counts if your water heater is electric.", kwh: 250 },
  { id: "standby", title: "Kill standby power with a power strip", how: "TVs, consoles, and chargers sip power all day when “off.” Flip the strip at night.", kwh: 200 },
  { id: "shower", title: "Use a low-flow showerhead", how: "1.5–2.0 gallons per minute instead of 2.5 means less hot water to heat (electric water heater).", kwh: 300 },
  { id: "fan", title: "Run a ceiling fan and raise the AC 4°F", how: "Fans cool people, not rooms, so turn them off when you leave.", kwh: 250 },
  { id: "fridge", title: "Fridge at 37–40°F, freezer at 0°F, coils dusted", how: "Colder than that wastes power. Vacuum the coils once or twice a year.", kwh: 60 },
  { id: "fullloads", title: "Run the dishwasher only when it's full, skip heated dry", how: "Let dishes air-dry with the door cracked.", kwh: 80 },
];

const DEFAULT_RATE = "17";

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function num(s: string) {
  const n = Number.parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n: number) {
  return n >= 100 ? money(Math.round(n)).replace(/\.00$/, "") : money(n);
}

export function PowerScreen() {
  const [loaded, setLoaded] = useState(false);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [devices, setDevices] = useState<Device[]>([]);
  const [doing, setDoing] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [watts, setWatts] = useState("");
  const [hours, setHours] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Saved>;
        if (typeof s.rate === "string") setRate(s.rate);
        if (Array.isArray(s.devices)) setDevices(s.devices.filter((d) => d && typeof d.name === "string"));
        if (Array.isArray(s.doing)) setDoing(s.doing.filter((t) => typeof t === "string"));
      }
    } catch {
      // Ignore unreadable saved data and start fresh.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ rate, devices, doing } satisfies Saved));
    } catch {
      // Storage full or blocked; keep working in memory.
    }
  }, [rate, devices, doing, loaded]);

  const dollarsPerKwh = num(rate) / 100;
  const rateIsDefault = rate.trim() === DEFAULT_RATE;

  const costOf = (w: number, h: number) => {
    const kwhDay = (w * h) / 1000;
    return { day: kwhDay * dollarsPerKwh, month: kwhDay * 30.4 * dollarsPerKwh, year: kwhDay * 365 * dollarsPerKwh, kwhMonth: kwhDay * 30.4 };
  };

  const deviceTotal = useMemo(
    () => devices.reduce((sum, d) => sum + (d.watts * d.hours * 30.4 * dollarsPerKwh) / 1000, 0),
    [devices, dollarsPerKwh],
  );

  const savingsKwh = TIPS.filter((t) => doing.includes(t.id)).reduce((s, t) => s + t.kwh, 0);
  const possibleKwh = TIPS.filter((t) => !doing.includes(t.id)).reduce((s, t) => s + t.kwh, 0);

  function pickPreset(p: (typeof PRESETS)[number]) {
    setName(p.name);
    setWatts(String(p.watts));
    setHours(String(p.hours));
  }

  function addDevice(e: React.FormEvent) {
    e.preventDefault();
    const w = num(watts);
    const h = Math.min(24, num(hours));
    if (!name.trim() || w <= 0 || h <= 0) return;
    setDevices((list) => [{ id: newId(), name: name.trim().slice(0, 40), watts: Math.min(20000, w), hours: h }, ...list].slice(0, 60));
    setName("");
    setWatts("");
    setHours("");
  }

  function updateDevice(id: string, patch: Partial<Device>) {
    setDevices((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  const preview = num(watts) > 0 && num(hours) > 0 ? costOf(num(watts), Math.min(24, num(hours))) : null;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Power saver</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find out what your space heater, dryer, or game console really costs at your rate, then check off the habits that shrink the electric
          bill.
        </p>
      </header>

      <section className="rounded-3xl bg-lime px-4 py-4 text-ink">
        <div className="flex items-start gap-3">
          <Zap className="mt-1 size-8 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <label className="block text-sm font-semibold" htmlFor="power-rate">
              Your electricity rate
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="power-rate"
                inputMode="decimal"
                value={rate}
                maxLength={6}
                onChange={(e) => setRate(e.target.value)}
                className="h-11 w-24 rounded-2xl bg-background/80 text-base"
              />
              <span className="text-sm font-semibold">¢ per kWh</span>
            </div>
            <p className="mt-2 text-xs leading-5">
              {rateIsDefault
                ? "17¢ is a starting guess near the recent U.S. home average, not your rate. Find “price per kWh” on your bill (or divide the bill's electric charges by the kWh used) and type it here."
                : "Using your rate. All dollar amounts below are estimates."}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        <div>
          <h2 className="font-serif text-2xl leading-tight">What does it cost to run?</h2>
          <p className="text-sm text-muted-foreground">Pick a common device or type your own. The wattage is on the label or in the manual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => pickPreset(p)}
              className={cn("h-8 rounded-full px-3 text-sm font-semibold", name === p.name ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {p.name}
            </button>
          ))}
        </div>
        <form onSubmit={addDevice} className="space-y-2">
          <Input
            placeholder="Device name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-2xl text-base"
            aria-label="Device name"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">
              Watts
              <Input inputMode="decimal" placeholder="1500" value={watts} onChange={(e) => setWatts(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
            </label>
            <label className="text-xs font-semibold">
              Hours a day
              <Input inputMode="decimal" placeholder="4" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
            </label>
          </div>
          {preview ? (
            <div className="grid grid-cols-3 gap-2 text-center" role="status">
              {[
                ["a day", preview.day],
                ["a month", preview.month],
                ["a year", preview.year],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-2xl bg-mint/70 px-2 py-2">
                  <p className="font-serif text-xl leading-tight">{fmtMoney(v as number)}</p>
                  <p className="text-xs">{label as string}</p>
                </div>
              ))}
            </div>
          ) : null}
          {preview ? <p className="text-xs text-muted-foreground">About {Math.round(preview.kwhMonth)} kWh a month at full listed wattage. Many devices draw less most of the time, so treat this as the high end.</p> : null}
          <Button type="submit" className="h-11 rounded-full px-5" disabled={!loaded || !name.trim() || num(watts) <= 0 || num(hours) <= 0}>
            <Plus className="size-4" aria-hidden="true" /> Add to my list
          </Button>
        </form>
      </section>

      {devices.length ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-bold tracking-wide text-primary uppercase">My devices · {devices.length}</h2>
            <p className="text-sm font-semibold">≈ {fmtMoney(deviceTotal)}/month</p>
          </div>
          <ul className="space-y-2">
            {[...devices]
              .sort((a, b) => b.watts * b.hours - a.watts * a.hours)
              .map((d) => {
                const c = costOf(d.watts, d.hours);
                return (
                  <li key={d.id} className="rounded-3xl border bg-card px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold break-words">{d.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtMoney(c.month)}/month · {fmtMoney(c.year)}/year
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDevices((list) => list.filter((x) => x.id !== d.id))}
                        aria-label={`Remove ${d.name}`}
                        className="p-1 text-muted-foreground"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{d.watts} W ·</span>
                      <button
                        type="button"
                        aria-label={`Fewer hours for ${d.name}`}
                        onClick={() => updateDevice(d.id, { hours: Math.max(0.25, Math.round((d.hours - (d.hours > 1 ? 1 : 0.25)) * 100) / 100) })}
                        className="size-8 rounded-full bg-secondary font-bold"
                      >
                        −
                      </button>
                      <span className="min-w-16 text-center font-semibold">{d.hours} h/day</span>
                      <button
                        type="button"
                        aria-label={`More hours for ${d.name}`}
                        onClick={() => updateDevice(d.id, { hours: Math.min(24, Math.round((d.hours + (d.hours >= 1 ? 1 : 0.25)) * 100) / 100) })}
                        className="size-8 rounded-full bg-secondary font-bold"
                      >
                        +
                      </button>
                      {d.hours > 1 ? (
                        <span className="ml-auto text-xs text-muted-foreground">1 h less saves {fmtMoney(costOf(d.watts, 1).year)}/yr</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="rounded-3xl bg-gold px-4 py-4 text-ink">
          <p className="text-xs font-bold tracking-wide uppercase">Habits that cut the bill</p>
          <p className="font-serif text-2xl leading-tight">
            {savingsKwh ? `≈ ${fmtMoney(savingsKwh * dollarsPerKwh)} a year saved` : "Tap the ones you already do or will try"}
          </p>
          <p className="text-sm">
            {doing.length} of {TIPS.length} checked
            {possibleKwh ? ` · up to ≈ ${fmtMoney(possibleKwh * dollarsPerKwh)}/yr more on the table` : " · nice work"}
          </p>
        </div>
        <ul className="space-y-2">
          {TIPS.map((t) => {
            const on = doing.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDoing((list) => (on ? list.filter((x) => x !== t.id) : [...list, t.id]))}
                  className={cn("flex w-full items-start gap-3 rounded-3xl border px-4 py-3 text-left shadow-sm", on ? "bg-lime/40" : "bg-card")}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-ink/30",
                    )}
                  >
                    {on ? <Check className="size-4" aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t.title}</span>
                    <span className="block text-sm text-muted-foreground">{t.how}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    ≈ {fmtMoney(t.kwh * dollarsPerKwh)}
                    <span className="block text-xs font-normal text-muted-foreground">/yr</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
        Savings are rough estimates for a typical home (about {TIPS.reduce((s, t) => s + t.kwh, 0).toLocaleString()} kWh a year if you did
        everything), multiplied by the rate you entered. Your home, climate, and appliances will change the real numbers. Check with your
        utility for free energy audits or rebates. Everything here is saved only on this phone, in this browser.
      </p>
    </div>
  );
}
