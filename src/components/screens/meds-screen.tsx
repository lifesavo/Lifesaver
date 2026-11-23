"use client";

import { useEffect, useMemo, useState } from "react";
import { BellPlus, Check, Pill, Plus, Trash2, Undo2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORE_KEY = "lifesaver.meds.v1";
const KEEP_DAYS = 60;
const REFILL_WARN_DAYS = 7;

type Med = {
  id: string;
  name: string;
  dose: string;
  times: string[]; // "HH:MM", 24h
  note: string;
  supply: number | null; // pills/doses left, optional
  perDose: number; // how many come out of the supply each time
};
/** taken[date][medId-time] = "HH:MM" when it was checked off */
type Store = { meds: Med[]; taken: Record<string, Record<string, string>> };

const EMPTY: Store = { meds: [], taken: {} };

const QUICK_TIMES: { label: string; time: string }[] = [
  { label: "Morning", time: "08:00" },
  { label: "Noon", time: "12:00" },
  { label: "Evening", time: "18:00" },
  { label: "Bedtime", time: "21:30" },
];

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shiftDay(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

function clock(time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayLetter(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "narrow" });
}

function wholeNumber(v: string, max = 9999) {
  const d = v.replace(/[^\d]/g, "").slice(0, 5);
  if (!d) return null;
  return Math.min(Number(d), max);
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** One repeating daily calendar event per dose time, each with an alert at the time. */
function downloadReminders(med: Med) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = dateKey(new Date()).replace(/-/g, "");
  const title = `Take ${med.name}${med.dose ? ` (${med.dose})` : ""}`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LifeSaver//Meds//EN"];
  for (const t of med.times) {
    const hm = t.replace(":", "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${newId()}@lifesaver`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}T${hm}00`,
      "DURATION:PT10M",
      "RRULE:FREQ=DAILY",
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape(med.note ? `${med.note}\nFrom LifeSaver Meds` : "From LifeSaver Meds")}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(title)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${med.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "med"}-reminders.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function daysLeft(med: Med) {
  if (med.supply == null || med.times.length === 0) return null;
  return Math.floor(med.supply / (med.perDose * med.times.length));
}

export function MedsScreen() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [customTime, setCustomTime] = useState("");
  const [medNote, setMedNote] = useState("");
  const [supply, setSupply] = useState("");
  const [perDose, setPerDose] = useState("1");
  const [refillFor, setRefillFor] = useState("");
  const [refillCount, setRefillCount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setToday(dateKey(new Date()));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Store) : null;
      if (parsed && Array.isArray(parsed.meds) && parsed.taken && typeof parsed.taken === "object") setStore(parsed);
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

  // Roll the day over if the app stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => {
      const k = dateKey(new Date());
      setToday((prev) => (prev && prev !== k ? k : prev));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const todayTaken = useMemo(() => store.taken[today] ?? {}, [store.taken, today]);

  const doses = useMemo(
    () =>
      store.meds
        .flatMap((m) => m.times.map((t) => ({ med: m, time: t, key: `${m.id}-${t}` })))
        .sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name)),
    [store.meds],
  );
  const doneCount = doses.filter((d) => todayTaken[d.key]).length;
  const nowHM = today ? nowTime() : "00:00";

  const last7 = useMemo(() => (today ? Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6)) : []), [today]);

  function setTaken(key: string, medId: string, on: boolean) {
    setStore((s) => {
      const day = { ...(s.taken[today] ?? {}) };
      const wasOn = Boolean(day[key]);
      if (on === wasOn) return s;
      if (on) day[key] = nowTime();
      else delete day[key];
      // Trim old days so storage stays small.
      const cutoff = shiftDay(today, -KEEP_DAYS);
      const taken: Store["taken"] = {};
      for (const [k, v] of Object.entries({ ...s.taken, [today]: day })) if (k >= cutoff) taken[k] = v;
      const meds = s.meds.map((m) =>
        m.id === medId && m.supply != null ? { ...m, supply: Math.max(0, m.supply + (on ? -m.perDose : m.perDose)) } : m,
      );
      return { meds, taken };
    });
  }

  function resetForm() {
    setName("");
    setDose("");
    setTimes(["08:00"]);
    setCustomTime("");
    setMedNote("");
    setSupply("");
    setPerDose("1");
  }

  function addMed(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 40);
    if (!n || times.length === 0) return;
    const med: Med = {
      id: newId(),
      name: n,
      dose: dose.trim().slice(0, 30),
      times: [...new Set(times)].sort(),
      note: medNote.trim().slice(0, 80),
      supply: wholeNumber(supply),
      perDose: Math.max(1, wholeNumber(perDose, 20) ?? 1),
    };
    setStore((s) => ({ ...s, meds: [...s.meds, med] }));
    resetForm();
    setAdding(false);
    setNote(`${med.name} added. Tap the bell to put daily alarms in your calendar.`);
  }

  function toggleTime(t: string) {
    setTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort()));
  }

  function removeMed(med: Med) {
    if (!window.confirm(`Remove ${med.name}? Its check-offs go too.`)) return;
    setStore((s) => ({ ...s, meds: s.meds.filter((m) => m.id !== med.id) }));
    setNote(`${med.name} removed.`);
  }

  function refill(e: React.FormEvent, med: Med) {
    e.preventDefault();
    const n = wholeNumber(refillCount);
    if (n == null) return;
    setStore((s) => ({ ...s, meds: s.meds.map((m) => (m.id === med.id ? { ...m, supply: (m.supply ?? 0) + n } : m)) }));
    setRefillFor("");
    setRefillCount("");
    setNote(`Added ${n} to ${med.name}.`);
  }

  const lowMeds = store.meds.filter((m) => {
    const d = daysLeft(m);
    return d != null && d <= REFILL_WARN_DAYS;
  });

  const form = (
    <form onSubmit={addMed} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
      <p className="font-serif text-2xl">{store.meds.length ? "Add another" : "Add a medicine or vitamin"}</p>
      <label className="block text-xs font-semibold">
        Name
        <Input placeholder="Like “Vitamin D” or “Allergy pill”" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <label className="block text-xs font-semibold">
        Dose <span className="font-normal text-muted-foreground">(optional, as written on your label)</span>
        <Input placeholder="Like “1 tablet” or “10 mg”" value={dose} maxLength={30} onChange={(e) => setDose(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <div>
        <p className="text-xs font-semibold">When</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {QUICK_TIMES.map((q) => (
            <button
              key={q.time}
              type="button"
              aria-pressed={times.includes(q.time)}
              onClick={() => toggleTime(q.time)}
              className={cn("h-9 rounded-full px-3 text-sm font-semibold", times.includes(q.time) ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {q.label} · {clock(q.time)}
            </button>
          ))}
          {times
            .filter((t) => !QUICK_TIMES.some((q) => q.time === t))
            .map((t) => (
              <button key={t} type="button" onClick={() => toggleTime(t)} className="h-9 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground" aria-label={`Remove ${clock(t)}`}>
                {clock(t)} <X className="inline size-3.5" aria-hidden="true" />
              </button>
            ))}
        </div>
        <div className="mt-2 flex gap-2">
          <label htmlFor="med-time" className="sr-only">
            Other time
          </label>
          <Input id="med-time" type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="h-11 flex-1 rounded-2xl text-base" />
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-full px-4"
            disabled={!/^\d{2}:\d{2}$/.test(customTime)}
            onClick={() => {
              if (!times.includes(customTime)) setTimes((c) => [...c, customTime].sort());
              setCustomTime("");
            }}
          >
            Add time
          </Button>
        </div>
      </div>
      <label className="block text-xs font-semibold">
        Note <span className="font-normal text-muted-foreground">(optional)</span>
        <Input placeholder="Like “with food”" value={medNote} maxLength={80} onChange={(e) => setMedNote(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">
          How many left <span className="font-normal text-muted-foreground">(optional)</span>
          <Input inputMode="numeric" placeholder="Like 30" value={supply} onChange={(e) => setSupply(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
        </label>
        <label className="block text-xs font-semibold">
          Per dose
          <Input inputMode="numeric" placeholder="1" value={perDose} onChange={(e) => setPerDose(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Add how many you have and we&apos;ll count down as you check off doses and warn you a week before you run out.</p>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-full px-5" disabled={!name.trim() || times.length === 0 || !loaded}>
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
        {store.meds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-full"
            onClick={() => {
              resetForm();
              setAdding(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Meds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Medicine and vitamin reminders without another app. Check off each dose, see your week at a glance, get a heads-up before you run out, and put daily alarms in your calendar.
        </p>
      </header>

      {loaded && (store.meds.length === 0 || adding) && form}

      {store.meds.length > 0 && !adding && (
        <>
          <section className="rounded-3xl bg-gold px-4 py-4 text-ink">
            <div className="flex items-center gap-2">
              <p className="font-serif text-2xl leading-tight">Today</p>
              <button type="button" className="ml-auto text-sm font-semibold underline" onClick={() => setAdding(true)}>
                + Add
              </button>
            </div>
            <p className="text-sm">
              {doneCount === doses.length ? "All doses checked off. Nice." : `${doneCount} of ${doses.length} doses taken`}
            </p>
            <ul className="mt-3 space-y-2">
              {doses.map(({ med, time, key }) => {
                const at = todayTaken[key];
                const late = !at && time < nowHM;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-pressed={Boolean(at)}
                      onClick={() => setTaken(key, med.id, !at)}
                      className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left", at ? "bg-background/50" : "bg-background")}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border-2", at ? "border-primary bg-primary text-primary-foreground" : "border-ink/30")}
                      >
                        {at && <Check className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-semibold break-words", at && "line-through opacity-60")}>
                          {med.name}
                          {med.dose && <span className="font-normal"> · {med.dose}</span>}
                        </span>
                        <span className={cn("block text-xs", late ? "font-semibold text-destructive" : "text-muted-foreground")}>
                          {clock(time)}
                          {at ? ` · taken at ${clock(at)}` : late ? " · not checked off yet" : ""}
                          {med.note && ` · ${med.note}`}
                        </span>
                      </span>
                      {at && <Undo2 className="size-4 shrink-0 text-muted-foreground" aria-label="Tap to undo" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {lowMeds.length > 0 && (
            <section className="rounded-3xl bg-pop px-4 py-3 text-white" role="status">
              <p className="text-xs font-bold tracking-wide uppercase">Refill soon</p>
              {lowMeds.map((m) => {
                const d = daysLeft(m) ?? 0;
                return (
                  <p key={m.id} className="text-sm">
                    {m.name}: {d <= 0 ? "out or less than a day left" : `about ${d} day${d === 1 ? "" : "s"} left`}
                  </p>
                );
              })}
            </section>
          )}

          <section aria-labelledby="meds-list" className="rounded-3xl border bg-card px-4 py-2 shadow-sm">
            <h2 id="meds-list" className="pt-1 text-xs font-bold tracking-wide text-primary uppercase">
              Your list · last 7 days
            </h2>
            <ul className="divide-y">
              {store.meds.map((m) => {
                const d = daysLeft(m);
                return (
                  <li key={m.id} className="py-3">
                    <div className="flex items-start gap-2">
                      <Pill className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold break-words">
                          {m.name}
                          {m.dose && <span className="font-normal text-muted-foreground"> · {m.dose}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.times.map(clock).join(", ")}
                          {m.supply != null && ` · ${m.supply} left${d != null ? ` (~${d} day${d === 1 ? "" : "s"})` : ""}`}
                        </p>
                        <div className="mt-2 flex gap-1" aria-label={`${m.name} doses checked off over the last 7 days`}>
                          {last7.map((day) => {
                            const got = m.times.filter((t) => store.taken[day]?.[`${m.id}-${t}`]).length;
                            const all = got === m.times.length;
                            return (
                              <span key={day} className="flex flex-col items-center gap-0.5" title={`${day}: ${got} of ${m.times.length}`}>
                                <span
                                  className={cn(
                                    "size-5 rounded-full",
                                    all ? "bg-primary" : got > 0 ? "bg-sun" : day === today ? "border-2 border-dashed border-muted-foreground/40" : "bg-muted",
                                  )}
                                />
                                <span className="text-[10px] text-muted-foreground">{dayLetter(day)}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Add daily ${m.name} alarms to your calendar`}
                        title="Add daily alarms to calendar"
                        onClick={() => downloadReminders(m)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary"
                      >
                        <BellPlus className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => removeMed(m)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    {refillFor === m.id ? (
                      <form onSubmit={(e) => refill(e, m)} className="mt-2 ml-6 flex gap-2">
                        <label htmlFor={`refill-${m.id}`} className="sr-only">
                          How many did you get
                        </label>
                        <Input
                          id={`refill-${m.id}`}
                          autoFocus
                          inputMode="numeric"
                          placeholder="How many did you get?"
                          value={refillCount}
                          onChange={(e) => setRefillCount(e.target.value)}
                          className="h-10 flex-1 rounded-2xl text-base"
                        />
                        <Button type="submit" className="h-10 rounded-full px-4" disabled={wholeNumber(refillCount) == null}>
                          Add
                        </Button>
                        <Button type="button" variant="ghost" className="h-10 rounded-full px-3" onClick={() => setRefillFor("")}>
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setRefillFor(m.id);
                          setRefillCount("");
                        }}
                        className="mt-2 ml-6 h-9 rounded-full bg-secondary px-3 text-sm font-semibold"
                      >
                        {m.supply == null ? "Track how many left" : "Refilled"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {note && (
        <p className="text-sm text-muted-foreground" role="status">
          {note}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Saved on this phone only. Nothing is sent anywhere. LifeSaver doesn&apos;t give medical advice: always take medicine the way your doctor or pharmacist told you, and ask them before changing anything. Calendar alarms repeat daily at each time you set.
      </p>
    </div>
  );
}
