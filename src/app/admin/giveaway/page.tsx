"use client";

import { useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Entry = {
  id: number;
  email: string;
  firstName: string | null;
  lastInitial: string | null;
  method: "signup" | "app" | "amoe";
  createdAt: string;
};

type Winner = {
  id: number;
  weekKey: string;
  email: string;
  firstName: string | null;
  lastInitial: string | null;
  entrants: number;
  status: "pending" | "paid" | "forfeited";
  drawnAt: string;
  paidAt: string | null;
  paidNote: string | null;
};

type AdminData = {
  currentWeekKey: string;
  lastWeekKey: string;
  week: { key: string; opensAt: string; closesAt: string; closed: boolean };
  entries: Entry[];
  winners: Winner[];
};

function ct(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function sqliteToIso(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

export default function AdminGiveawayPage() {
  const [token, setToken] = useState("");
  const [week, setWeek] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function load(weekKey = week) {
    setError("");
    const query = weekKey ? `?week=${encodeURIComponent(weekKey)}` : "";
    const response = await fetch(`/api/admin/giveaway${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as AdminData & { ok?: boolean; message?: string };
    if (!response.ok || body.ok === false) {
      setError(body.message || "Could not load the giveaway.");
      return;
    }
    setData(body);
    setWeek(body.week.key);
  }

  async function post(payload: Record<string, unknown>, success: string) {
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/giveaway", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { ok?: boolean; message?: string; winner?: Winner };
    if (!response.ok || body.ok === false) {
      setError(body.message || "That didn't work.");
      return;
    }
    setMessage(
      body.winner
        ? `Winner for week of ${body.winner.weekKey}: ${body.winner.firstName ?? ""} ${body.winner.lastInitial ?? ""}. (${body.winner.email}), drawn from ${body.winner.entrants} entries. Email them now; they have 72 hours to respond. Nothing was paid automatically.`
        : success,
    );
    await load();
  }

  const weekWinners = data?.winners.filter((winner) => winner.weekKey === data.week.key) ?? [];
  const hasActive = weekWinners.some((winner) => winner.status !== "forfeited");

  return (
    <PhoneFrame>
      <div className="space-y-4">
        <h1 className="font-serif text-3xl tracking-tight">Weekly giveaway admin</h1>
        <p className="text-sm text-muted-foreground">
          One equal entry per person per week. Draws pick uniformly at random and record the winner. Payouts are
          manual: pay the winner yourself, then mark them paid here.
        </p>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <label className="block text-sm font-semibold">
            Admin token
            <Input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-1 h-12 rounded-2xl"
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Week (Monday, YYYY-MM-DD; blank = current)
            <Input
              value={week}
              onChange={(event) => setWeek(event.target.value)}
              placeholder="2026-11-16"
              className="mt-1 h-12 rounded-2xl"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="h-11 flex-1 rounded-full">
              Load
            </Button>
            {data && (
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-full" onClick={() => void load(data.lastWeekKey)}>
                Last week
              </Button>
            )}
          </div>
        </form>

        {message && <p role="status" className="rounded-2xl bg-lime px-3 py-2 text-sm font-semibold text-ink">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {data && (
          <>
            <section className="rounded-3xl border bg-card px-4 py-3 text-sm">
              <p className="font-semibold">Week of {data.week.key}{data.week.key === data.currentWeekKey ? " (current)" : ""}</p>
              <p className="text-muted-foreground">
                {ct(data.week.opensAt)} → {ct(data.week.closesAt)} · {data.week.closed ? "Closed" : "Open"}
              </p>
              <p className="mt-1 font-serif text-2xl">{data.entries.length} entrants · 1 entry each</p>
              <Button
                type="button"
                className="mt-2 h-11 w-full rounded-full"
                disabled={!data.week.closed || hasActive || data.entries.length === 0}
                onClick={() => {
                  if (window.confirm(`Draw a random winner for the week of ${data.week.key}?`)) {
                    void post({ action: "draw", week: data.week.key }, "Drawn.");
                  }
                }}
              >
                {hasActive ? "Winner already drawn" : weekWinners.length ? "Draw alternate winner" : "Draw winner"}
              </Button>
              {!data.week.closed && (
                <p className="mt-1 text-xs text-muted-foreground">You can draw after entries close Sunday 8 PM CT.</p>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl">Entrants</h2>
              <ul className="max-h-80 overflow-y-auto rounded-2xl border bg-card text-sm">
                {data.entries.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-2 border-b px-3 py-2 last:border-b-0">
                    <span>
                      <span className="block font-medium">
                        {entry.firstName ?? "—"} {entry.lastInitial ? `${entry.lastInitial}.` : ""}
                      </span>
                      <span className="block text-xs text-muted-foreground">{entry.email}</span>
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      1 entry
                      <br />
                      {entry.method === "amoe" ? "free alt. entry" : entry.method}
                    </span>
                  </li>
                ))}
                {data.entries.length === 0 && <li className="px-3 py-2 text-muted-foreground">No entries yet.</li>}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl">Winners</h2>
              <ul className="space-y-2">
                {data.winners.map((winner) => (
                  <li key={winner.id} className="rounded-2xl border bg-card px-3 py-2 text-sm">
                    <p className="font-semibold">
                      Week of {winner.weekKey}: {winner.firstName ?? "—"} {winner.lastInitial ? `${winner.lastInitial}.` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {winner.email} · drawn {ct(sqliteToIso(winner.drawnAt))} from {winner.entrants} · {winner.status}
                      {winner.paidAt ? ` ${ct(sqliteToIso(winner.paidAt))}` : ""}
                      {winner.paidNote ? ` · ${winner.paidNote}` : ""}
                    </p>
                    {winner.status === "pending" && (
                      <div className="mt-2 space-y-2">
                        <Input
                          placeholder="Payout note (e.g. Venmo @name, ref #)"
                          value={notes[winner.id] ?? ""}
                          onChange={(event) => setNotes({ ...notes, [winner.id]: event.target.value })}
                          className="h-10 rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="h-10 flex-1 rounded-full"
                            onClick={() => void post({ action: "paid", id: winner.id, note: notes[winner.id] ?? "" }, "Marked paid.")}
                          >
                            Mark paid
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 flex-1 rounded-full"
                            onClick={() => {
                              if (window.confirm("Mark forfeited (no reply in 72 hours or ineligible)? You can then draw an alternate.")) {
                                void post({ action: "forfeit", id: winner.id, note: notes[winner.id] ?? "" }, "Marked forfeited.");
                              }
                            }}
                          >
                            Forfeit
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {data.winners.length === 0 && <li className="text-sm text-muted-foreground">No winners yet.</li>}
              </ul>
            </section>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
