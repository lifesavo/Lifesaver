"use client";

import { useEffect, useMemo, useState } from "react";
import { BellPlus, Check, Copy, ExternalLink, Package, Plus, Trash2, Undo2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORE_KEY = "lifesaver.packages.v1";

type Carrier = "ups" | "usps" | "fedex" | "dhl" | "ontrac" | "amazon" | "other";

type Parcel = {
  id: string;
  name: string;
  tracking: string;
  carrier: Carrier;
  expected: string; // YYYY-MM-DD or ""
  link: string; // custom tracking link for "other"
  delivered: boolean;
  deliveredAt: number | null;
  addedAt: number;
};

const CARRIERS: { id: Carrier; label: string }[] = [
  { id: "ups", label: "UPS" },
  { id: "usps", label: "USPS" },
  { id: "fedex", label: "FedEx" },
  { id: "dhl", label: "DHL" },
  { id: "ontrac", label: "OnTrac" },
  { id: "amazon", label: "Amazon" },
  { id: "other", label: "Other" },
];

function carrierLabel(c: Carrier) {
  return CARRIERS.find((x) => x.id === c)?.label ?? "Other";
}

function clean(num: string) {
  return num.replace(/[\s-]+/g, "").toUpperCase();
}

/** Best guess from the number's format. People can always change it. */
export function detectCarrier(raw: string): Carrier | null {
  const n = clean(raw);
  if (!n) return null;
  if (/^1Z[0-9A-Z]{16}$/.test(n)) return "ups";
  if (/^TBA\d{9,15}$/.test(n)) return "amazon";
  if (/^[A-Z]{2}\d{9}US$/.test(n)) return "usps";
  if (/^(94|93|92|95|82)\d{18,20}$/.test(n)) return "usps";
  if (/^[CD]\d{14}$/.test(n)) return "ontrac";
  if (/^\d{12}$/.test(n) || /^\d{15}$/.test(n) || /^96\d{20}$/.test(n) || /^\d{34}$/.test(n)) return "fedex";
  if (/^\d{10}$/.test(n) || /^JJD\d{18}$/.test(n) || /^JVGL\d+$/.test(n)) return "dhl";
  return null;
}

/** Official carrier tracking pages only. LifeSaver doesn't fetch status itself. */
function trackUrl(p: Parcel): string | null {
  const n = encodeURIComponent(clean(p.tracking));
  switch (p.carrier) {
    case "ups":
      return `https://www.ups.com/track?tracknum=${n}`;
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`;
    case "ontrac":
      return `https://www.ontrac.com/tracking/?number=${n}`;
    case "amazon":
      return "https://www.amazon.com/gp/css/order-history";
    default:
      return /^https:\/\//i.test(p.link) ? p.link : null;
  }
}

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
  return new Date(y, m - 1, d);
}

function shiftDay(key: string, days: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function niceDate(key: string, today: string) {
  if (key === today) return "today";
  if (key === shiftDay(today, 1)) return "tomorrow";
  if (key === shiftDay(today, -1)) return "yesterday";
  return parseKey(key).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** All-day event on the expected date with an 8 AM alert, so the phone's calendar does the reminding. */
function downloadIcs(p: Parcel) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = trackUrl(p);
  const summary = `Package: ${p.name}`;
  const desc = `${carrierLabel(p.carrier)} ${clean(p.tracking)}${url ? `\n${url}` : ""}\nFrom LifeSaver Packages`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeSaver//Packages//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${p.id}@lifesaver`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${p.expected.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${shiftDay(p.expected, 1).replace(/-/g, "")}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`${p.name} should arrive today`)}`,
    "TRIGGER:PT8H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${p.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "package"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

function ParcelRow({
  p,
  today,
  onToggle,
  onDelete,
}: {
  p: Parcel;
  today: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = trackUrl(p);
  const late = !p.delivered && p.expected && p.expected < today;
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={p.delivered}
          aria-label={p.delivered ? `Mark ${p.name} not delivered` : `Mark ${p.name} delivered`}
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
            p.delivered ? "border-primary bg-primary text-primary-foreground" : "border-ink/30",
          )}
        >
          {p.delivered ? <Check className="size-4" aria-hidden="true" /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold break-words", p.delivered && "line-through opacity-60")}>{p.name}</p>
          <p className="text-xs break-all text-muted-foreground">
            {carrierLabel(p.carrier)} · {clean(p.tracking)}
          </p>
          <p className={cn("text-xs", late ? "font-semibold text-destructive" : "text-muted-foreground")}>
            {p.delivered
              ? `Delivered${p.deliveredAt ? ` ${niceDate(dateKey(new Date(p.deliveredAt)), today)}` : ""}`
              : p.expected
                ? late
                  ? `Expected ${niceDate(p.expected, today)}. Check the carrier page.`
                  : `Expected ${niceDate(p.expected, today)}`
                : "No date yet"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
              >
                {p.carrier === "amazon" ? "Your Amazon orders" : `Track on ${carrierLabel(p.carrier)}`}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(clean(p.tracking));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // Clipboard blocked; the number is shown above.
                }
              }}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-semibold"
            >
              <Copy className="size-3.5" aria-hidden="true" /> {copied ? "Copied" : "Copy #"}
            </button>
            {!p.delivered && p.expected && p.expected >= today ? (
              <button
                type="button"
                onClick={() => downloadIcs(p)}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-semibold"
              >
                <BellPlus className="size-3.5" aria-hidden="true" /> Remind me
              </button>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={onDelete} aria-label={`Delete ${p.name}`} className="p-1 text-muted-foreground">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function PackagesScreen() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<Parcel | null>(null);

  const [name, setName] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState<Carrier | "">("");
  const [expected, setExpected] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setToday(dateKey(new Date()));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Parcel[]) : null;
      if (Array.isArray(parsed)) setParcels(parsed);
    } catch {
      // Start fresh if storage is unavailable or corrupted.
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(parcels));
    } catch {
      // Storage full or blocked; still works for this visit.
    }
  }, [parcels, loaded]);

  const guessed = detectCarrier(tracking);
  const chosen: Carrier = carrier || guessed || "other";

  function resetForm() {
    setName("");
    setTracking("");
    setCarrier("");
    setExpected("");
    setLink("");
  }

  function addParcel(e: React.FormEvent) {
    e.preventDefault();
    if (!tracking.trim()) return;
    const p: Parcel = {
      id: newId(),
      name: name.trim() || `${carrierLabel(chosen)} package`,
      tracking: tracking.trim(),
      carrier: chosen,
      expected,
      link: chosen === "other" ? link.trim() : "",
      delivered: false,
      deliveredAt: null,
      addedAt: Date.now(),
    };
    setParcels((list) => [p, ...list]);
    resetForm();
    setAdding(false);
  }

  function toggle(id: string) {
    setParcels((list) =>
      list.map((p) => (p.id === id ? { ...p, delivered: !p.delivered, deliveredAt: p.delivered ? null : Date.now() } : p)),
    );
  }

  function remove(p: Parcel) {
    setLastDeleted(p);
    setParcels((list) => list.filter((x) => x.id !== p.id));
  }

  const groups = useMemo(() => {
    const open = parcels.filter((p) => !p.delivered);
    const byDate = (a: Parcel, b: Parcel) => (a.expected || "9999").localeCompare(b.expected || "9999") || b.addedAt - a.addedAt;
    return {
      late: open.filter((p) => p.expected && p.expected < today).sort(byDate),
      today: open.filter((p) => p.expected === today),
      coming: open.filter((p) => p.expected && p.expected > today).sort(byDate),
      noDate: open.filter((p) => !p.expected).sort(byDate),
      delivered: parcels.filter((p) => p.delivered).sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0)),
    };
  }, [parcels, today]);

  const openCount = parcels.length - groups.delivered.length;

  const form = (
    <form onSubmit={addParcel} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
      <p className="font-serif text-2xl">{parcels.length ? "Add a package" : "Add your first package"}</p>
      <label className="block text-xs font-semibold">
        Tracking number
        <Input
          placeholder="Paste it from the shipping email"
          value={tracking}
          maxLength={60}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setTracking(e.target.value)}
          className="mt-1 h-11 rounded-2xl text-base"
        />
      </label>
      {tracking.trim() ? (
        <p className="text-xs text-muted-foreground" role="status">
          {guessed ? `Looks like ${carrierLabel(guessed)}.` : "We couldn't tell the carrier from this number. Pick one below."} Change it if that&apos;s wrong.
        </p>
      ) : null}
      <div>
        <p className="text-xs font-semibold">Carrier</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {CARRIERS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={chosen === c.id}
              onClick={() => setCarrier(c.id)}
              className={cn("h-9 rounded-full px-3 text-sm font-semibold", chosen === c.id ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {chosen === "other" ? (
        <label className="block text-xs font-semibold">
          Tracking link <span className="font-normal text-muted-foreground">(optional, from the shipping email)</span>
          <Input
            type="url"
            placeholder="https://"
            value={link}
            maxLength={500}
            onChange={(e) => setLink(e.target.value)}
            className="mt-1 h-11 rounded-2xl text-base"
          />
        </label>
      ) : null}
      <label className="block text-xs font-semibold">
        What is it? <span className="font-normal text-muted-foreground">(optional)</span>
        <Input
          placeholder="Like “Shoes” or “Mom's birthday gift”"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 h-11 rounded-2xl text-base"
        />
      </label>
      <label className="block text-xs font-semibold">
        Expected delivery <span className="font-normal text-muted-foreground">(optional)</span>
        <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-full px-5" disabled={!tracking.trim() || !loaded}>
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
        {parcels.length > 0 ? (
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
        ) : null}
      </div>
    </form>
  );

  const section = (title: string, list: Parcel[], tone?: string) =>
    list.length ? (
      <section className="rounded-3xl border bg-card px-4 py-2 shadow-sm">
        <h2 className={cn("pt-1 text-xs font-bold tracking-wide uppercase", tone ?? "text-primary")}>
          {title} · {list.length}
        </h2>
        <ul className="divide-y">
          {list.map((p) => (
            <ParcelRow key={p.id} p={p} today={today} onToggle={() => toggle(p.id)} onDelete={() => remove(p)} />
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Packages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every package in one list, no tracking app needed. Paste a tracking number, we spot the carrier, and one tap opens its official
          tracking page. Add the expected date for a delivery-day reminder in your calendar.
        </p>
      </header>

      {lastDeleted ? (
        <div className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
          <span className="flex-1">Deleted {lastDeleted.name}.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold underline"
            onClick={() => {
              setParcels((list) => [lastDeleted, ...list]);
              setLastDeleted(null);
            }}
          >
            <Undo2 className="size-3.5" aria-hidden="true" /> Undo
          </button>
        </div>
      ) : null}

      {loaded && (parcels.length === 0 || adding) ? form : null}

      {parcels.length > 0 && !adding ? (
        <>
          <section className="flex items-center gap-3 rounded-3xl bg-cyan px-4 py-4 text-ink">
            <Package className="size-8 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-serif text-2xl leading-tight">
                {openCount === 0 ? "All delivered" : `${openCount} on the way`}
              </p>
              <p className="text-sm">
                {groups.today.length
                  ? `${groups.today.length} expected today`
                  : groups.late.length
                    ? `${groups.late.length} past the expected date`
                    : "Nothing expected today"}
              </p>
            </div>
            <Button type="button" variant="secondary" className="h-10 rounded-full px-4" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" /> Add
            </Button>
          </section>

          {section("Past expected date", groups.late, "text-destructive")}
          {section("Arriving today", groups.today)}
          {section("Coming up", groups.coming)}
          {section("No date yet", groups.noDate)}

          {groups.delivered.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <button type="button" className="text-sm font-semibold underline" onClick={() => setShowDelivered((s) => !s)}>
                  {showDelivered ? "Hide" : "Show"} delivered ({groups.delivered.length})
                </button>
                <button
                  type="button"
                  className="ml-auto text-sm text-muted-foreground underline"
                  onClick={() => setParcels((list) => list.filter((p) => !p.delivered))}
                >
                  Clear delivered
                </button>
              </div>
              {showDelivered ? section("Delivered", groups.delivered, "text-muted-foreground") : null}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
        LifeSaver doesn&apos;t pull live delivery status or connect to any carrier account. Track buttons open each carrier&apos;s own
        official tracking page, and Amazon numbers open your Amazon orders. Carrier names belong to their owners. Your list is saved only on
        this phone.
      </p>
    </div>
  );
}
