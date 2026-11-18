"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, TriangleAlert } from "lucide-react";
import type { WeatherAlert } from "@/lib/weather/alerts";

const NOTIFY_KEY = "lifesaver.alerts.notify";
const SEEN_KEY = "lifesaver.alerts.seen";
const POLL_MS = 10 * 60 * 1000;

type Loc = { query: string; label: string };

export function useAlerts(fallback: string) {
  const [alerts, setAlerts] = useState<WeatherAlert[] | null>(null);
  const [place, setPlace] = useState<string>("");
  const [error, setError] = useState("");
  const loc = useRef<Loc | null>(null);

  const fetchFor = useCallback(async (next: Loc) => {
    loc.current = next;
    try {
      const response = await fetch(`/api/alerts?${next.query}`);
      const data = (await response.json()) as { ok?: boolean; message?: string; alerts?: WeatherAlert[]; place?: string | null };
      if (!response.ok || !data.ok) throw new Error(data.message || "Alert lookup failed.");
      setAlerts(data.alerts ?? []);
      setPlace(data.place || next.label);
      setError("");
      return data.alerts ?? [];
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alert lookup failed.");
      return null;
    }
  }, []);

  const byPlace = useCallback((q: string) => fetchFor({ query: `q=${encodeURIComponent(q)}`, label: q }), [fetchFor]);

  const locate = useCallback(() => {
    const fallbackLoad = () => {
      if (fallback) void byPlace(fallback);
      else setError("Enter a ZIP or city to check alerts.");
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) return fallbackLoad();
    navigator.geolocation.getCurrentPosition(
      (p) => void fetchFor({ query: `lat=${p.coords.latitude.toFixed(4)}&lng=${p.coords.longitude.toFixed(4)}`, label: "your location" }),
      fallbackLoad,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [fallback, byPlace, fetchFor]);

  useEffect(() => {
    queueMicrotask(locate);
  }, [locate]);

  const refresh = useCallback(() => (loc.current ? fetchFor(loc.current) : Promise.resolve(null)), [fetchFor]);

  return { alerts, place, error, locate, byPlace, refresh };
}

function serious(a: WeatherAlert) {
  return a.severity === "Extreme" || a.severity === "Severe";
}

/** While the app is open: poll and show a browser notification for new Severe/Extreme alerts. */
function useAlertNotifications(refresh: () => Promise<WeatherAlert[] | null>, alerts: WeatherAlert[] | null) {
  const notifyNew = useCallback((list: WeatherAlert[] | null) => {
    if (!list || typeof Notification === "undefined" || Notification.permission !== "granted" || localStorage.getItem(NOTIFY_KEY) !== "1") return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[];
    } catch {
      seen = [];
    }
    const fresh = list.filter((a) => serious(a) && !seen.includes(a.id));
    for (const a of fresh.slice(0, 3)) {
      try {
        new Notification(`⚠️ ${a.event}`, { body: a.headline, tag: a.id });
      } catch {
        /* some mobile browsers only allow service-worker notifications */
      }
    }
    if (fresh.length) localStorage.setItem(SEEN_KEY, JSON.stringify([...fresh.map((a) => a.id), ...seen].slice(0, 200)));
  }, []);

  useEffect(() => {
    queueMicrotask(() => notifyNew(alerts));
  }, [alerts, notifyNew]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);
}

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function AlertsBanner({ zip }: { zip: string }) {
  const { alerts, refresh } = useAlerts(zip);
  useAlertNotifications(refresh, alerts);
  if (!alerts || alerts.length === 0) return null;
  const top = alerts[0];
  const red = serious(top);
  return (
    <Link href="/alerts" className={`flex items-start gap-3 rounded-3xl px-4 py-3 text-white ${red ? "bg-[#dc2626]" : "bg-[#ea580c]"}`} role="alert">
      <TriangleAlert className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-wide uppercase">{top.severity} · National Weather Service</span>
        <span className="block font-serif text-xl leading-tight">{top.event}</span>
        <span className="block text-xs text-white/90">
          {top.expires ? `Until ${fmt(top.ends ?? top.expires)}` : ""}
          {alerts.length > 1 ? ` · +${alerts.length - 1} more` : ""} · Tap for details
        </span>
      </span>
    </Link>
  );
}

function AlertItem({ a }: { a: WeatherAlert }) {
  const red = serious(a);
  return (
    <li className={`rounded-3xl border-2 p-4 ${red ? "border-[#dc2626]" : a.severity === "Moderate" ? "border-[#ea580c]" : "border-ink/10"} bg-card`}>
      <p className={`text-xs font-bold tracking-wide uppercase ${red ? "text-[#dc2626]" : "text-[#ea580c]"}`}>
        {a.severity} · {a.urgency}
      </p>
      <h3 className="font-serif text-2xl leading-tight">{a.event}</h3>
      <p className="mt-1 text-sm font-semibold">{a.headline}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {a.areaDesc}
        {a.expires ? ` · Expires ${fmt(a.expires)}` : ""}
      </p>
      {a.instruction && (
        <div className="mt-2 rounded-2xl bg-sun/50 p-3 text-sm whitespace-pre-line">
          <p className="text-xs font-bold uppercase">What to do</p>
          {a.instruction}
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-semibold">Full details</summary>
        <p className="mt-1 whitespace-pre-line text-muted-foreground">{a.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{a.senderName}</p>
      </details>
    </li>
  );
}

export function AlertList({ alerts }: { alerts: WeatherAlert[] }) {
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <AlertItem key={a.id} a={a} />
      ))}
    </ul>
  );
}

export function AlertsScreen({ zip }: { zip: string }) {
  const { alerts, place, error, locate, byPlace, refresh } = useAlerts(zip);
  useAlertNotifications(refresh, alerts);
  const [q, setQ] = useState("");
  const [notify, setNotify] = useState(() => typeof window !== "undefined" && localStorage.getItem(NOTIFY_KEY) === "1" && typeof Notification !== "undefined" && Notification.permission === "granted");
  const [notifyMsg, setNotifyMsg] = useState("");

  async function toggleNotify() {
    if (notify) {
      localStorage.setItem(NOTIFY_KEY, "0");
      setNotify(false);
      return;
    }
    if (typeof Notification === "undefined") {
      setNotifyMsg("This browser doesn't support notifications. On iPhone, add LifeSaver to your Home Screen first.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(NOTIFY_KEY, "1");
      setNotify(true);
      setNotifyMsg("On. While LifeSaver is open, it checks about every 10 minutes and notifies you of new Severe or Extreme alerts. Not guaranteed, so keep your phone's emergency alerts on too.");
    } else setNotifyMsg("Notifications are blocked in your browser settings.");
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">Weather and travel alerts</p>
        <h1 className="font-serif text-3xl tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Active watches, warnings, and advisories from the National Weather Service{place ? ` for ${place}` : ""}.</p>
      </header>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) void byPlace(q.trim());
        }}
      >
        <label htmlFor="alerts-q" className="sr-only">ZIP or city</label>
        <input id="alerts-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ZIP or city, ST" className="h-12 min-w-0 flex-1 rounded-full border px-4 text-base" />
        <button type="submit" className="h-12 rounded-full bg-ink px-4 text-sm font-bold text-white">Check</button>
        <button type="button" onClick={locate} className="h-12 rounded-full bg-lime px-3 text-sm font-bold text-ink">Near me</button>
      </form>
      <button type="button" onClick={() => void toggleNotify()} className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold ${notify ? "bg-lime text-ink" : "border-2 border-ink"}`}>
        <BellRing className="size-4" aria-hidden="true" /> {notify ? "Severe alert notifications on" : "Notify me of severe alerts"}
      </button>
      {notifyMsg && <p className="text-xs text-muted-foreground">{notifyMsg}</p>}
      {error && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
      {alerts == null && !error && <p className="text-sm text-muted-foreground" role="status">Checking alerts…</p>}
      {alerts && alerts.length === 0 && <p className="rounded-3xl bg-lime px-4 py-4 font-semibold text-ink">No active weather alerts{place ? ` for ${place}` : ""} right now.</p>}
      {alerts && alerts.length > 0 && <AlertList alerts={alerts} />}
      <Link href="/plan" className="block rounded-2xl bg-cyan px-4 py-3 text-sm font-bold text-ink">Traveling? Open a saved trip to see alerts at your destination and along the way.</Link>
      <p className="text-xs text-muted-foreground">From api.weather.gov. LifeSaver can miss or delay an alert. In an emergency follow local officials and your phone&apos;s Wireless Emergency Alerts.</p>
    </div>
  );
}

type TripAlertData = {
  destination: { name: string; alerts: WeatherAlert[] };
  route: { checkedPoints: number; alerts: (WeatherAlert & { near: string })[] } | null;
  roads: { state: string; label: string; href: string }[];
  note: string;
};

export function TripAlerts({ destination, origin }: { destination: string; origin: string }) {
  const [data, setData] = useState<TripAlertData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancel = false;
    const params = new URLSearchParams({ destination });
    if (origin) params.set("origin", origin);
    fetch(`/api/alerts/trip?${params}`)
      .then((r) => r.json())
      .then((d: TripAlertData & { ok?: boolean; message?: string }) => {
        if (cancel) return;
        if (d.ok === false) setError(d.message || "Alert check failed.");
        else setData(d);
      })
      .catch(() => !cancel && setError("Alert check failed."));
    return () => {
      cancel = true;
    };
  }, [destination, origin]);

  return (
    <section className="space-y-2 rounded-3xl border-2 border-ink/10 bg-card p-4">
      <h2 className="flex items-center gap-1 font-serif text-2xl"><TriangleAlert className="size-5" aria-hidden="true" /> Travel alerts</h2>
      {error && <p className="text-sm text-muted-foreground">{error}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Checking the National Weather Service…</p>}
      {data && (
        <>
          <p className="text-sm font-semibold">
            {data.destination.alerts.length ? `${data.destination.alerts.length} active alert${data.destination.alerts.length === 1 ? "" : "s"} in ${data.destination.name}` : `No active alerts in ${data.destination.name} right now.`}
          </p>
          {data.destination.alerts.length > 0 && <AlertList alerts={data.destination.alerts.slice(0, 3)} />}
          {data.route && (
            <p className="text-sm font-semibold">
              {data.route.alerts.length ? `${data.route.alerts.length} more along the way` : "Nothing active at the points checked along the way."}
            </p>
          )}
          {data.route && data.route.alerts.length > 0 && <AlertList alerts={data.route.alerts.slice(0, 3)} />}
          {data.roads.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.roads.map((r) => (
                <a key={r.state} href={r.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-xs font-bold text-white">
                  {r.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{data.note} Alerts are for right now. Check again closer to your trip.</p>
        </>
      )}
    </section>
  );
}
