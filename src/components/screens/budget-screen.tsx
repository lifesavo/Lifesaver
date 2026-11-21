"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/money";

const STORE_KEY = "lifesaver.budget.v1";
const MAX_SPENDS = 2000;
const MAX_CATS = 24;

type Category = { id: string; name: string; emoji: string; limit: number };
type Spend = { id: string; cat: string; amount: number; note: string; date: string; created: number };
type Store = { categories: Category[]; spends: Spend[] };

// Starter categories with no amounts set. You fill in your own numbers.
const STARTER: Category[] = [
  { id: "groceries", name: "Groceries", emoji: "🛒", limit: 0 },
  { id: "eating-out", name: "Eating out", emoji: "🍔", limit: 0 },
  { id: "gas", name: "Gas & rides", emoji: "⛽", limit: 0 },
  { id: "fun", name: "Fun", emoji: "🎉", limit: 0 },
  { id: "shopping", name: "Shopping", emoji: "🛍️", limit: 0 },
  { id: "other", name: "Other", emoji: "📦", limit: 0 },
];

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function toAmount(text: string) {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      if (Array.isArray(parsed.categories) && Array.isArray(parsed.spends)) return parsed as Store;
    }
  } catch {
    // Ignore bad or blocked storage and start fresh.
  }
  return { categories: STARTER, spends: [] };
}

export function BudgetScreen() {
  const [store, setStore] = useState<Store>({ categories: STARTER, spends: [] });
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState(STARTER[0].id);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const t = todayKey();
    setToday(t);
    setDate(t);
    setMonth(t.slice(0, 7));
    const s = load();
    setStore(s);
    if (s.categories[0]) setCat(s.categories[0].id);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Storage full or blocked; the budget still works for this visit.
    }
  }, [store, loaded]);

  const monthSpends = useMemo(
    () => store.spends.filter((s) => s.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created),
    [store.spends, month],
  );

  const spentBy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of monthSpends) map[s.cat] = (map[s.cat] ?? 0) + s.amount;
    return map;
  }, [monthSpends]);

  const totalLimit = store.categories.reduce((sum, c) => sum + (c.limit || 0), 0);
  const totalSpent = monthSpends.reduce((sum, s) => sum + s.amount, 0);
  const left = totalLimit - totalSpent;
  const isThisMonth = month === today.slice(0, 7);
  const daysLeft = useMemo(() => {
    if (!isThisMonth || !today) return 0;
    const [y, m, d] = today.split("-").map(Number);
    return new Date(y, m, 0).getDate() - d + 1;
  }, [isThisMonth, today]);
  const catById = (id: string) => store.categories.find((c) => c.id === id);

  function addSpend(e: React.FormEvent) {
    e.preventDefault();
    const value = toAmount(amount);
    if (value <= 0 || !catById(cat)) return;
    if (store.spends.length >= MAX_SPENDS) {
      setFlash("You've logged a lot! Delete some old entries first.");
      return;
    }
    const when = date || today;
    setStore((prev) => ({ ...prev, spends: [...prev.spends, { id: newId(), cat, amount: value, note: note.trim().slice(0, 80), date: when, created: Date.now() }] }));
    const c = catById(cat);
    if (c && c.limit > 0 && when.startsWith(month)) {
      const nowLeft = c.limit - (spentBy[cat] ?? 0) - value;
      setFlash(nowLeft >= 0 ? `${money(nowLeft)} left for ${c.name} this month.` : `Heads up: ${c.name} is ${money(-nowLeft)} over this month.`);
    } else {
      setFlash(`Logged ${money(value)}.`);
    }
    setAmount("");
    setNote("");
  }

  function setLimit(id: string, text: string) {
    const value = toAmount(text);
    setStore((prev) => ({ ...prev, categories: prev.categories.map((c) => (c.id === id ? { ...c, limit: value } : c)) }));
  }

  function renameCat(id: string, name: string) {
    setStore((prev) => ({ ...prev, categories: prev.categories.map((c) => (c.id === id ? { ...c, name: name.slice(0, 30) } : c)) }));
  }

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCat.trim().slice(0, 30);
    if (!name || store.categories.length >= MAX_CATS) return;
    setStore((prev) => ({ ...prev, categories: [...prev.categories, { id: newId(), name, emoji: "💵", limit: 0 }] }));
    setNewCat("");
  }

  function removeCategory(id: string) {
    const used = store.spends.some((s) => s.cat === id);
    if (used && !window.confirm("Remove this category and the spending logged under it?")) return;
    setStore((prev) => ({ categories: prev.categories.filter((c) => c.id !== id), spends: prev.spends.filter((s) => s.cat !== id) }));
    if (cat === id) setCat(store.categories.find((c) => c.id !== id)?.id ?? "");
  }

  function removeSpend(id: string) {
    setStore((prev) => ({ ...prev, spends: prev.spends.filter((s) => s.id !== id) }));
  }

  const noLimits = totalLimit === 0;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Budget</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick what you want to spend each month, log what you spend in two taps, and always know what&apos;s left. No bank login needed.
        </p>
      </header>

      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="grid size-10 place-items-center rounded-full bg-muted">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="font-serif text-xl">{month ? monthLabel(month) : ""}</p>
        <button type="button" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="grid size-10 place-items-center rounded-full bg-muted">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <section className={cn("rounded-3xl px-4 py-5", noLimits ? "bg-ink text-white" : left >= 0 ? "bg-lime text-ink" : "bg-destructive text-white")}>
        {noLimits ? (
          <>
            <p className="font-serif text-2xl">Set your first budget</p>
            <p className="mt-1 text-sm text-white/80">Tap &quot;Set amounts&quot; below and type what you want to spend per category this month. You can log spending right away either way.</p>
            <p className="mt-3 text-sm">Spent this month: <span className="font-bold">{money(totalSpent)}</span></p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold tracking-wide uppercase">{left >= 0 ? "Left to spend" : "Over budget"}</p>
            <p className="font-serif text-4xl">{money(Math.abs(left))}</p>
            <p className="mt-1 text-sm">
              {money(totalSpent)} spent of {money(totalLimit)}
              {isThisMonth && left > 0 && daysLeft > 0 ? ` · about ${money(left / daysLeft)} a day for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}` : ""}
            </p>
          </>
        )}
      </section>

      <form onSubmit={addSpend} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        <p className="text-sm font-semibold">Log spending</p>
        <div className="flex gap-2">
          <label htmlFor="budget-amount" className="sr-only">Amount</label>
          <Input
            id="budget-amount"
            inputMode="decimal"
            placeholder="$0.00"
            value={amount}
            maxLength={10}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 w-28 rounded-2xl text-base"
          />
          <label htmlFor="budget-note" className="sr-only">What was it?</label>
          <Input
            id="budget-note"
            placeholder="What for? (optional)"
            value={note}
            maxLength={80}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 flex-1 rounded-2xl text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {store.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
              className={cn("h-9 rounded-full px-3 text-sm font-semibold", cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted")}
            >
              <span aria-hidden="true">{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label className="block flex-1 text-xs font-semibold">
            Date
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
          </label>
          <Button type="submit" className="h-11 rounded-full px-5" disabled={toAmount(amount) <= 0 || !cat || !loaded}>
            <Plus className="size-4" aria-hidden="true" /> Log it
          </Button>
        </div>
      </form>

      {flash && (
        <p aria-live="polite" className="rounded-2xl bg-sun px-4 py-2 text-sm font-semibold text-ink">
          {flash}
        </p>
      )}

      <section className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-wide text-primary uppercase">Categories</h2>
          <button type="button" className="text-sm font-semibold underline" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "Set amounts"}
          </button>
        </div>
        <ul className="space-y-3">
          {store.categories.map((c) => {
            const spent = spentBy[c.id] ?? 0;
            const pct = c.limit > 0 ? Math.min(100, (spent / c.limit) * 100) : 0;
            const over = c.limit > 0 && spent > c.limit;
            return (
              <li key={c.id}>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{c.emoji}</span>
                    <Input aria-label="Category name" value={c.name} onChange={(e) => renameCat(c.id, e.target.value)} className="h-10 flex-1 rounded-2xl text-base" />
                    <Input
                      aria-label={`Monthly amount for ${c.name}`}
                      inputMode="decimal"
                      placeholder="$ / mo"
                      defaultValue={c.limit ? String(c.limit) : ""}
                      onBlur={(e) => setLimit(c.id, e.target.value)}
                      className="h-10 w-24 rounded-2xl text-base"
                    />
                    <button type="button" aria-label={`Remove ${c.name}`} onClick={() => removeCategory(c.id)} className="grid size-10 place-items-center rounded-full text-muted-foreground">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold">
                        <span aria-hidden="true">{c.emoji}</span> {c.name}
                      </span>
                      <span className={cn(over && "font-bold text-destructive")}>
                        {money(spent)}
                        {c.limit > 0 ? ` / ${money(c.limit)}` : ""}
                      </span>
                    </div>
                    {c.limit > 0 && (
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${c.name} used`}>
                        <div className={cn("h-full rounded-full", over ? "bg-destructive" : pct >= 80 ? "bg-sun" : "bg-primary")} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {editing && (
          <>
            <p className="text-xs text-muted-foreground">Amounts are per month and carry over to every month. Leave blank to just track.</p>
            <form onSubmit={addCategory} className="flex gap-2">
              <Input aria-label="New category" placeholder="New category, like “Pets”" value={newCat} maxLength={30} onChange={(e) => setNewCat(e.target.value)} className="h-10 flex-1 rounded-2xl text-base" />
              <Button type="submit" variant="secondary" className="h-10 rounded-full" disabled={!newCat.trim() || store.categories.length >= MAX_CATS}>
                Add
              </Button>
            </form>
          </>
        )}
      </section>

      <section className="space-y-2 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        <h2 className="text-xs font-bold tracking-wide text-primary uppercase">Spending · {monthSpends.length}</h2>
        {monthSpends.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged for {month ? monthLabel(month) : "this month"} yet.</p>
        ) : (
          <ul className="divide-y">
            {monthSpends.map((s) => {
              const c = catById(s.cat);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl" aria-hidden="true">{c?.emoji ?? "💵"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{s.note || c?.name || "Spending"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {dayLabel(s.date)}
                      {s.note && c ? ` · ${c.name}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{money(s.amount)}</span>
                  <button type="button" aria-label="Delete entry" onClick={() => removeSpend(s.id)} className="grid size-9 place-items-center rounded-full text-muted-foreground">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Your budget is saved on this phone only. Nothing is sent anywhere, and LifeSaver never asks for your bank login.
      </p>
    </div>
  );
}
