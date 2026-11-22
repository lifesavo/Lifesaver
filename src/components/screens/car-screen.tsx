"use client";

import { useEffect, useMemo, useState } from "react";
import { BellPlus, Check, Plus, Trash2, Wrench } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORE_KEY = "lifesaver.car.v1";
const MAX_LOG = 500;

type Car = { id: string; name: string; miles: number };
type Item = { id: string; carId: string; name: string; everyMiles: number | null; everyMonths: number | null; lastDate: string; lastMiles: number | null };
type LogEntry = { id: string; carId: string; name: string; date: string; miles: number | null; cost: number | null };
type Store = { cars: Car[]; items: Item[]; log: LogEntry[]; activeId: string };

/** Typical starting points only. The owner's manual always wins, and the screen says so. */
const COMMON: { name: string; everyMiles: number | null; everyMonths: number | null }[] = [
  { name: "Oil change", everyMiles: 5000, everyMonths: 6 },
  { name: "Tire rotation", everyMiles: 6000, everyMonths: 6 },
  { name: "Engine air filter", everyMiles: 15000, everyMonths: 12 },
  { name: "Cabin air filter", everyMiles: 15000, everyMonths: 12 },
  { name: "Brake check", everyMiles: 12000, everyMonths: 12 },
  { name: "Wiper blades", everyMiles: null, everyMonths: 12 },
  { name: "Battery check", everyMiles: null, everyMonths: 12 },
  { name: "Registration renewal", everyMiles: null, everyMonths: 12 },
];

const EMPTY: Store = { cars: [], items: [], log: [], activeId: "" };

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addMonths(key: string, months: number) {
  const d = parseKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return dateKey(d);
}

function daysBetween(a: string, b: string) {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

function friendlyDate(key: string) {
  return parseKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const mi = (n: number) => `${Math.round(n).toLocaleString()} mi`;
const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function digits(v: string) {
  const d = v.replace(/[^\d]/g, "").slice(0, 7);
  return d ? Number(d) : null;
}

type Status = { tone: "none" | "ok" | "soon" | "due"; text: string; nextDate: string };

function statusOf(item: Item, car: Car, today: string): Status {
  if (!item.lastDate && item.lastMiles == null) return { tone: "none", text: "No record yet. Log when it was last done.", nextDate: "" };
  const parts: string[] = [];
  let tone: Status["tone"] = "ok";
  let nextDate = "";
  if (item.everyMiles && item.lastMiles != null) {
    const left = item.lastMiles + item.everyMiles - car.miles;
    parts.push(left <= 0 ? `${mi(-left)} past due` : `${mi(left)} to go`);
    if (left <= 0) tone = "due";
    else if (left <= Math.min(1000, item.everyMiles * 0.15)) tone = "soon";
  }
  if (item.everyMonths && item.lastDate) {
    nextDate = addMonths(item.lastDate, item.everyMonths);
    const days = daysBetween(today, nextDate);
    parts.push(days < 0 ? `was due ${friendlyDate(nextDate)}` : days === 0 ? "due today" : `by ${friendlyDate(nextDate)}`);
    if (days <= 0) tone = "due";
    else if (days <= 30 && tone !== "due") tone = "soon";
  }
  if (parts.length === 0) return { tone: "ok", text: "Logged. Set an interval to see when it's due.", nextDate };
  const text = parts.join(" · ");
  return { tone, text: tone === "due" ? `Due now: ${text}` : tone === "soon" ? `Due soon: ${text}` : text, nextDate };
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function downloadReminder(title: string, date: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const next = parseKey(date);
  next.setDate(next.getDate() + 1);
  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LifeSaver//Car care//EN",
      "BEGIN:VEVENT",
      `UID:${newId()}@lifesaver`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${dateKey(next).replace(/-/g, "")}`,
      `SUMMARY:${icsEscape(title)}`,
      "DESCRIPTION:From LifeSaver Car care",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(title)}`,
      "TRIGGER:-P6DT15H",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "car-reminder"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function intervalLabel(item: Item) {
  const bits = [item.everyMiles ? `every ${mi(item.everyMiles)}` : "", item.everyMonths ? `every ${item.everyMonths} mo` : ""].filter(Boolean);
  return bits.length ? bits.join(" or ") : "no interval set";
}

function ItemRow({
  item,
  car,
  today,
  onLog,
  onDelete,
}: {
  item: Item;
  car: Car;
  today: string;
  onLog: (date: string, miles: number | null, cost: number | null) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [miles, setMiles] = useState("");
  const [cost, setCost] = useState("");
  const s = statusOf(item, car, today);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const c = cost.trim() ? Number(cost.replace(/[^\d.]/g, "")) : null;
    onLog(date || today, digits(miles) ?? (car.miles || null), c != null && Number.isFinite(c) ? Math.round(c * 100) / 100 : null);
    setOpen(false);
    setCost("");
    setMiles("");
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 size-3 shrink-0 rounded-full",
            s.tone === "due" ? "bg-destructive" : s.tone === "soon" ? "bg-sun" : s.tone === "ok" ? "bg-[oklch(0.65_0.17_150)]" : "bg-muted-foreground/30",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">{item.name}</p>
          <p className={cn("text-sm", s.tone === "due" ? "font-semibold text-destructive" : "text-muted-foreground")}>{s.text}</p>
          <p className="text-xs text-muted-foreground">
            {intervalLabel(item)}
            {item.lastDate && ` · last ${friendlyDate(item.lastDate)}`}
            {item.lastMiles != null && ` at ${mi(item.lastMiles)}`}
          </p>
        </div>
        {s.nextDate && (
          <button
            type="button"
            aria-label={`Add a reminder for ${item.name} to your calendar`}
            title="Add reminder to calendar"
            onClick={() => downloadReminder(`${car.name}: ${item.name}`, s.nextDate)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary"
          >
            <BellPlus className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={onDelete}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <form onSubmit={save} className="mt-2 space-y-2 rounded-2xl bg-muted px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block text-xs font-semibold">
              Date done
              <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 rounded-2xl bg-background text-base" />
            </label>
            <label className="block text-xs font-semibold">
              Odometer
              <Input inputMode="numeric" placeholder={car.miles ? String(car.miles) : "Miles"} value={miles} onChange={(e) => setMiles(e.target.value)} className="mt-1 h-11 rounded-2xl bg-background text-base" />
            </label>
            <label className="block text-xs font-semibold">
              Cost $
              <Input inputMode="decimal" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1 h-11 rounded-2xl bg-background text-base" />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-10 rounded-full px-4">
              <Check className="size-4" aria-hidden="true" /> Save
            </Button>
            <Button type="button" variant="ghost" className="h-10 rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDate(today);
            setOpen(true);
          }}
          className="mt-2 ml-6 h-9 rounded-full bg-secondary px-3 text-sm font-semibold"
        >
          <Wrench className="mr-1 inline size-3.5" aria-hidden="true" />
          Log it done
        </button>
      )}
    </li>
  );
}

export function CarScreen() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [carName, setCarName] = useState("");
  const [carMiles, setCarMiles] = useState("");
  const [addingCar, setAddingCar] = useState(false);
  const [odo, setOdo] = useState("");
  const [customName, setCustomName] = useState("");
  const [customMiles, setCustomMiles] = useState("");
  const [customMonths, setCustomMonths] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setToday(dateKey(new Date()));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Store) : null;
      if (parsed && Array.isArray(parsed.cars) && Array.isArray(parsed.items) && Array.isArray(parsed.log)) setStore(parsed);
    } catch {
      // Start fresh if storage is unavailable or corrupted.
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Storage full or blocked; still works for this visit.
    }
  }, [store, loaded]);

  const car = store.cars.find((c) => c.id === store.activeId) ?? store.cars[0];

  const items = useMemo(() => {
    if (!car || !today) return [];
    const rank = { due: 0, soon: 1, none: 2, ok: 3 } as const;
    return store.items
      .filter((i) => i.carId === car.id)
      .map((i) => ({ item: i, tone: statusOf(i, car, today).tone }))
      .sort((a, b) => rank[a.tone] - rank[b.tone] || a.item.name.localeCompare(b.item.name))
      .map((x) => x.item);
  }, [store.items, car, today]);

  const carLog = useMemo(() => (car ? store.log.filter((l) => l.carId === car.id).sort((a, b) => b.date.localeCompare(a.date)) : []), [store.log, car]);
  const yearSpent = carLog.filter((l) => l.date.slice(0, 4) === today.slice(0, 4)).reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const dueCount = car && today ? items.filter((i) => statusOf(i, car, today).tone === "due").length : 0;

  function addCar(e: React.FormEvent) {
    e.preventDefault();
    const name = carName.trim().slice(0, 40);
    if (!name) return;
    const id = newId();
    setStore((s) => ({ ...s, cars: [...s.cars, { id, name, miles: digits(carMiles) ?? 0 }], activeId: id }));
    setCarName("");
    setCarMiles("");
    setAddingCar(false);
    setNote("");
  }

  function updateOdo(e: React.FormEvent) {
    e.preventDefault();
    const n = digits(odo);
    if (!car || n == null) return;
    setStore((s) => ({ ...s, cars: s.cars.map((c) => (c.id === car.id ? { ...c, miles: n } : c)) }));
    setOdo("");
    setNote(`Odometer set to ${mi(n)}.`);
  }

  function addCommon(names: string[]) {
    if (!car) return;
    const have = new Set(store.items.filter((i) => i.carId === car.id).map((i) => i.name.toLowerCase()));
    const add = COMMON.filter((c) => names.includes(c.name) && !have.has(c.name.toLowerCase())).map((c) => ({
      id: newId(),
      carId: car.id,
      name: c.name,
      everyMiles: c.everyMiles,
      everyMonths: c.everyMonths,
      lastDate: "",
      lastMiles: null,
    }));
    setStore((s) => ({ ...s, items: [...s.items, ...add] }));
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = customName.trim().slice(0, 40);
    if (!car || !name) return;
    const months = digits(customMonths);
    setStore((s) => ({
      ...s,
      items: [...s.items, { id: newId(), carId: car.id, name, everyMiles: digits(customMiles), everyMonths: months ? Math.min(months, 120) : null, lastDate: "", lastMiles: null }],
    }));
    setCustomName("");
    setCustomMiles("");
    setCustomMonths("");
  }

  function logItem(item: Item, date: string, miles: number | null, cost: number | null) {
    if (!car) return;
    setStore((s) => ({
      ...s,
      cars: s.cars.map((c) => (c.id === car.id && miles != null && miles > c.miles ? { ...c, miles } : c)),
      items: s.items.map((i) => (i.id === item.id ? { ...i, lastDate: date, lastMiles: miles } : i)),
      log: [{ id: newId(), carId: car.id, name: item.name, date, miles, cost }, ...s.log].slice(0, MAX_LOG),
    }));
    setNote(`Logged ${item.name}.`);
  }

  function removeCar() {
    if (!car || !window.confirm(`Remove ${car.name} and its history from this phone?`)) return;
    setStore((s) => {
      const cars = s.cars.filter((c) => c.id !== car.id);
      return { cars, items: s.items.filter((i) => i.carId !== car.id), log: s.log.filter((l) => l.carId !== car.id), activeId: cars[0]?.id ?? "" };
    });
  }

  const carForm = (
    <form onSubmit={addCar} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
      <p className="font-serif text-2xl">{store.cars.length ? "Add another car" : "Add your car"}</p>
      <label className="block text-xs font-semibold">
        Nickname
        <Input placeholder="Like “2016 Civic” or “Mom's van”" value={carName} maxLength={40} onChange={(e) => setCarName(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <label className="block text-xs font-semibold">
        Odometer right now <span className="font-normal text-muted-foreground">(optional)</span>
        <Input inputMode="numeric" placeholder="Miles" value={carMiles} onChange={(e) => setCarMiles(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-full px-5" disabled={!carName.trim() || !loaded}>
          <Plus className="size-4" aria-hidden="true" /> Add car
        </Button>
        {store.cars.length > 0 && (
          <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={() => setAddingCar(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  const missingCommon = car ? COMMON.filter((c) => !items.some((i) => i.name.toLowerCase() === c.name.toLowerCase())) : [];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Car care</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Oil, tires, filters, and registration in one spot. See what&apos;s due by miles or months, log what you paid, and put the next one in your calendar.
        </p>
      </header>

      {loaded && (!car || addingCar) && carForm}

      {car && !addingCar && (
        <>
          <section className="rounded-3xl bg-mint px-4 py-4 text-ink">
            <div className="flex flex-wrap items-center gap-2">
              {store.cars.length > 1 ? (
                <select
                  aria-label="Which car"
                  value={car.id}
                  onChange={(e) => setStore((s) => ({ ...s, activeId: e.target.value }))}
                  className="h-10 max-w-full rounded-full border bg-background px-3 font-serif text-xl"
                >
                  {store.cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-serif text-2xl leading-tight break-words">🚗 {car.name}</p>
              )}
              <button type="button" className="ml-auto text-sm font-semibold underline" onClick={() => setAddingCar(true)}>
                + Car
              </button>
            </div>
            <p className="mt-1 text-sm">
              {car.miles ? mi(car.miles) : "Odometer not set"}
              {dueCount > 0 ? ` · ${dueCount} due now` : ""}
              {yearSpent > 0 ? ` · ${money(yearSpent)} spent this year` : ""}
            </p>
            <form onSubmit={updateOdo} className="mt-3 flex gap-2">
              <label htmlFor="car-odo" className="sr-only">
                Update odometer
              </label>
              <Input id="car-odo" inputMode="numeric" placeholder="Update odometer" value={odo} onChange={(e) => setOdo(e.target.value)} className="h-11 flex-1 rounded-2xl bg-background text-base" />
              <Button type="submit" className="h-11 rounded-full px-4" disabled={digits(odo) == null}>
                Update
              </Button>
            </form>
          </section>

          {items.length > 0 && (
            <section aria-labelledby="car-items" className="rounded-3xl border bg-card px-4 py-2 shadow-sm">
              <h2 id="car-items" className="pt-1 text-xs font-bold tracking-wide text-primary uppercase">
                Maintenance
              </h2>
              <ul className="divide-y">
                {items.map((i) => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    car={car}
                    today={today}
                    onLog={(d, m, c) => logItem(i, d, m, c)}
                    onDelete={() => setStore((s) => ({ ...s, items: s.items.filter((x) => x.id !== i.id) }))}
                  />
                ))}
              </ul>
            </section>
          )}

          {missingCommon.length > 0 && (
            <section className="rounded-3xl bg-secondary px-4 py-4">
              <p className="font-semibold">{items.length ? "Add more" : "Start with the usual"}</p>
              <p className="text-xs text-muted-foreground">Intervals are typical starting points, not rules. Your owner&apos;s manual wins, and you can change them anytime by removing and re-adding.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingCommon.map((c) => (
                  <button key={c.name} type="button" onClick={() => addCommon([c.name])} className="h-9 rounded-full bg-background px-3 text-sm font-semibold">
                    + {c.name}
                  </button>
                ))}
              </div>
              {missingCommon.length > 1 && (
                <Button type="button" className="mt-3 h-10 rounded-full px-4" onClick={() => addCommon(missingCommon.map((c) => c.name))}>
                  Add all {missingCommon.length}
                </Button>
              )}
            </section>
          )}

          <form onSubmit={addCustom} className="space-y-2 rounded-3xl border bg-card px-4 py-4 shadow-sm">
            <p className="font-semibold">Your own item</p>
            <label htmlFor="car-custom" className="sr-only">
              Item name
            </label>
            <Input id="car-custom" placeholder="Like “Transmission fluid” or “Inspection”" value={customName} maxLength={40} onChange={(e) => setCustomName(e.target.value)} className="h-11 rounded-2xl text-base" />
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold">
                Every … miles
                <Input inputMode="numeric" placeholder="Optional" value={customMiles} onChange={(e) => setCustomMiles(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
              </label>
              <label className="block text-xs font-semibold">
                Every … months
                <Input inputMode="numeric" placeholder="Optional" value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
              </label>
            </div>
            <Button type="submit" className="h-10 rounded-full px-4" disabled={!customName.trim()}>
              <Plus className="size-4" aria-hidden="true" /> Add item
            </Button>
          </form>

          {note && (
            <p role="status" className="rounded-2xl bg-lime px-3 py-2 text-sm font-semibold text-ink">
              {note}
            </p>
          )}

          {carLog.length > 0 && (
            <section aria-labelledby="car-history" className="rounded-3xl bg-muted px-4 py-3">
              <h2 id="car-history" className="text-xs font-bold tracking-wide uppercase">
                History
              </h2>
              <ul className="mt-1 divide-y">
                {carLog.slice(0, 30).map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {friendlyDate(l.date)}
                        {l.miles != null && ` · ${mi(l.miles)}`}
                      </span>
                    </span>
                    {l.cost != null && <span className="font-semibold">{money(l.cost)}</span>}
                    <button
                      type="button"
                      aria-label={`Delete ${l.name} on ${friendlyDate(l.date)} from history`}
                      onClick={() => setStore((s) => ({ ...s, log: s.log.filter((x) => x.id !== l.id) }))}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" className="text-sm text-muted-foreground underline" onClick={removeCar}>
            Remove {car.name}
          </button>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Your car info is saved on this phone only. Nothing is sent anywhere. Calendar reminders alert you about a week before the due date.
      </p>
    </div>
  );
}
