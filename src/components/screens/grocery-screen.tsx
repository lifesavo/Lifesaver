"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, Trash2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FetchPrompt } from "@/components/fetch-prompt";
import { money } from "@/lib/money";
import { addReceiptTrip, hasTripOn, todayKey } from "@/lib/receipts";

const STORAGE_KEY = "lifesaver.grocery.v1";
const MAX_STORES = 3;

type GroceryItem = {
  id: string;
  name: string;
  qty: number;
  done: boolean;
  /** Price per unit, keyed by store id. Only what the user typed in. */
  prices: Record<string, number>;
};

type Store = { id: string; name: string };

type GroceryState = { items: GroceryItem[]; stores: Store[] };

const EMPTY: GroceryState = { items: [], stores: [] };

const STAPLES = ["Milk", "Eggs", "Bread", "Bananas", "Chicken", "Rice", "Coffee", "Paper towels"];

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function readState(): GroceryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<GroceryState>;
    const stores = Array.isArray(parsed.stores)
      ? parsed.stores.filter((s): s is Store => typeof s?.id === "string" && typeof s?.name === "string").slice(0, MAX_STORES)
      : [];
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((i): i is GroceryItem => typeof i?.id === "string" && typeof i?.name === "string")
          .map((i) => ({
            id: i.id,
            name: i.name,
            qty: Number.isFinite(i.qty) && i.qty > 0 ? Math.min(99, Math.round(i.qty)) : 1,
            done: Boolean(i.done),
            prices: typeof i.prices === "object" && i.prices ? i.prices : {},
          }))
      : [];
    return { items, stores };
  } catch {
    return EMPTY;
  }
}

export function GroceryScreen() {
  const [state, setState] = useState<GroceryState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [storeDraft, setStoreDraft] = useState("");
  const [comparing, setComparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tripLogged, setTripLogged] = useState(false);

  useEffect(() => {
    // Load once on the client; localStorage is not available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readState());
    setTripLogged(hasTripOn(todayKey(), "grocery"));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked; the list still works for this visit.
    }
  }, [state, loaded]);

  const toBuy = state.items.filter((i) => !i.done);
  const inCart = state.items.filter((i) => i.done);

  const compare = useMemo(() => {
    const priced = state.items.filter((i) => state.stores.some((s) => i.prices[s.id] > 0));
    const totals = state.stores.map((store) => {
      let total = 0;
      let missing = 0;
      for (const item of priced) {
        const p = item.prices[store.id];
        if (p > 0) total += p * item.qty;
        else missing += 1;
      }
      return { store, total, missing };
    });
    // Only rank stores that have a price for every priced item, so totals are apples to apples.
    const complete = totals.filter((t) => t.missing === 0 && t.total > 0);
    const ranked = [...complete].sort((a, b) => a.total - b.total);
    const tie = ranked.length >= 2 && Math.abs(ranked[0].total - ranked[1].total) < 0.005;
    const best = ranked.length >= 2 && !tie ? ranked[0] : null;
    const worst = best ? ranked[ranked.length - 1] : null;
    let split = 0;
    for (const item of priced) {
      const ps = state.stores.map((s) => item.prices[s.id]).filter((p) => p > 0);
      if (ps.length) split += Math.min(...ps) * item.qty;
    }
    return { priced, totals, best, tie, savings: best && worst ? worst.total - best.total : 0, split };
  }, [state]);

  function addItem(name: string) {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!clean) return;
    setState((prev) => {
      const existing = prev.items.find((i) => i.name.toLowerCase() === clean.toLowerCase());
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === existing.id ? { ...i, done: false, qty: i.done ? i.qty : Math.min(99, i.qty + 1) } : i,
          ),
        };
      }
      return { ...prev, items: [{ id: newId(), name: clean, qty: 1, done: false, prices: {} }, ...prev.items] };
    });
  }

  function updateItem(id: string, patch: Partial<GroceryItem>) {
    setState((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }

  function removeItem(id: string) {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  }

  function setPrice(itemId: string, storeId: string, value: string) {
    const n = Number.parseFloat(value);
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id !== itemId) return i;
        const prices = { ...i.prices };
        if (Number.isFinite(n) && n > 0) prices[storeId] = Math.round(n * 100) / 100;
        else delete prices[storeId];
        return { ...i, prices };
      }),
    }));
  }

  function addStore() {
    const clean = storeDraft.trim().slice(0, 24);
    if (!clean || state.stores.length >= MAX_STORES) return;
    setState((prev) => ({ ...prev, stores: [...prev.stores, { id: newId(), name: clean }] }));
    setStoreDraft("");
  }

  function removeStore(id: string) {
    setState((prev) => ({
      stores: prev.stores.filter((s) => s.id !== id),
      items: prev.items.map((i) => {
        const prices = { ...i.prices };
        delete prices[id];
        return { ...i, prices };
      }),
    }));
  }

  async function copyList() {
    const text = toBuy.map((i) => `☐ ${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(`Grocery list\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function cheapestStoreId(item: GroceryItem) {
    let bestId: string | null = null;
    let bestPrice = Infinity;
    let count = 0;
    for (const s of state.stores) {
      const p = item.prices[s.id];
      if (p > 0) {
        count += 1;
        if (p < bestPrice) {
          bestPrice = p;
          bestId = s.id;
        }
      }
    }
    return count >= 2 ? bestId : null;
  }

  function renderItem(item: GroceryItem) {
    const cheapest = cheapestStoreId(item);
    return (
      <li key={item.id} className="border-b last:border-b-0">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => updateItem(item.id, { done: !item.done })}
            aria-label={item.done ? `Put ${item.name} back on the list` : `Check off ${item.name}`}
            aria-pressed={item.done}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
              item.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {item.done && <Check className="size-4" aria-hidden="true" />}
          </button>
          <span className={cn("min-w-0 flex-1 truncate", item.done && "text-muted-foreground line-through")}>
            {item.name}
          </span>
          <div className="flex items-center gap-1" aria-label={`Quantity of ${item.name}`}>
            <button
              type="button"
              className="size-8 rounded-full bg-muted text-lg leading-none"
              aria-label={`Fewer ${item.name}`}
              onClick={() => updateItem(item.id, { qty: Math.max(1, item.qty - 1) })}
            >
              −
            </button>
            <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
            <button
              type="button"
              className="size-8 rounded-full bg-muted text-lg leading-none"
              aria-label={`More ${item.name}`}
              onClick={() => updateItem(item.id, { qty: Math.min(99, item.qty + 1) })}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground"
            aria-label={`Remove ${item.name}`}
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        {comparing && state.stores.length > 0 && (
          <div className="grid gap-2 px-3 pb-3" style={{ gridTemplateColumns: `repeat(${state.stores.length}, minmax(0, 1fr))` }}>
            {state.stores.map((store) => (
              <label key={store.id} className="block">
                <span
                  className={cn(
                    "block truncate text-[11px] text-muted-foreground",
                    cheapest === store.id && "font-bold text-primary",
                  )}
                >
                  {store.name}
                  {cheapest === store.id && " · cheapest"}
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="each"
                    defaultValue={item.prices[store.id] ?? ""}
                    onChange={(e) => setPrice(item.id, store.id, e.target.value)}
                    className={cn("h-9 rounded-xl pl-5", cheapest === store.id && "border-primary")}
                  />
                </span>
              </label>
            ))}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Grocery list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add it, check it off in the aisle, and see which store is cheaper for your whole cart.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addItem(draft);
          setDraft("");
        }}
      >
        <label htmlFor="grocery-add" className="sr-only">
          Add an item
        </label>
        <Input
          id="grocery-add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item, like eggs"
          autoComplete="off"
          enterKeyHint="done"
          className="h-12 rounded-full px-4"
        />
        <Button type="submit" className="h-12 rounded-full px-4" disabled={!draft.trim()}>
          <Plus aria-hidden="true" /> Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5" aria-label="Quick add">
        {STAPLES.filter((s) => !toBuy.some((i) => i.name.toLowerCase() === s.toLowerCase())).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addItem(s)}
            className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
          >
            + {s}
          </button>
        ))}
      </div>

      {loaded && state.items.length === 0 && (
        <p className="rounded-3xl bg-lime px-4 py-4 text-sm leading-6 text-ink">
          Your list is empty. Add what you need, or tap a staple above. Everything stays on this phone, in this
          browser. No account needed.
        </p>
      )}

      {toBuy.length > 0 && (
        <section aria-labelledby="to-buy-heading" className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <h2 id="to-buy-heading" className="font-serif text-2xl tracking-tight">
              To buy <span className="text-base text-muted-foreground">({toBuy.length})</span>
            </h2>
            <button type="button" onClick={copyList} className="flex items-center gap-1 text-sm font-medium text-primary">
              <Copy className="size-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy list"}
            </button>
          </div>
          <ul className="overflow-hidden rounded-2xl border bg-card">{toBuy.map(renderItem)}</ul>
        </section>
      )}

      {inCart.length > 0 && (
        <section aria-labelledby="in-cart-heading" className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <h2 id="in-cart-heading" className="font-serif text-2xl tracking-tight">
              In the cart <span className="text-base text-muted-foreground">({inCart.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, items: prev.items.filter((i) => !i.done) }))}
              className="text-sm font-medium text-primary"
            >
              Clear checked
            </button>
          </div>
          <ul className="overflow-hidden rounded-2xl border bg-card">{inCart.map(renderItem)}</ul>
        </section>
      )}

      {loaded && inCart.length > 0 && (
        <FetchPrompt
          title={toBuy.length === 0 ? "Done shopping? Snap this receipt in Fetch for points" : "Snap this receipt in Fetch for points"}
          detail={
            toBuy.length === 0
              ? "Your list is checked off. Open Fetch and snap the paper receipt to earn points, then log the trip so LifeSaver can remind you and add the rewards you type in to your totals."
              : "As you check items off, keep the receipt. When you're done, snap it in Fetch for points and log the trip here."
          }
          logged={tripLogged}
          logLabel="Log this grocery trip"
          onLogTrip={() => {
            if (tripLogged) return;
            const storeName = state.stores[0]?.name || "";
            addReceiptTrip({
              date: todayKey(),
              store: storeName,
              note: `${inCart.length} item${inCart.length === 1 ? "" : "s"} checked off`,
              source: "grocery",
            });
            setTripLogged(true);
          }}
        />
      )}

      <section aria-labelledby="compare-heading" className="space-y-3 rounded-3xl bg-ink px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="compare-heading" className="text-xs font-bold tracking-wide text-lime uppercase">
              Price compare
            </h2>
            <p className="mt-1 font-serif text-xl leading-tight">Which store is cheaper for your list?</p>
          </div>
          {state.stores.length > 0 && state.items.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 shrink-0 rounded-full px-3"
              onClick={() => setComparing((v) => !v)}
              aria-expanded={comparing}
            >
              {comparing ? "Done" : "Enter prices"}
            </Button>
          )}
        </div>
        <p className="text-sm leading-6 text-white/80">
          Add up to {MAX_STORES} stores you shop at, then type the shelf price you see (or from the store app). We only
          use the prices you enter. Nothing is looked up or sent.
        </p>

        {state.stores.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {state.stores.map((s) => (
              <li key={s.id} className="flex items-center gap-1 rounded-full bg-white/15 py-1 pr-1 pl-3 text-sm">
                {s.name}
                <button
                  type="button"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => removeStore(s.id)}
                  className="flex size-6 items-center justify-center rounded-full hover:bg-white/20"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {state.stores.length < MAX_STORES && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addStore();
            }}
          >
            <label htmlFor="grocery-store" className="sr-only">
              Store name
            </label>
            <Input
              id="grocery-store"
              value={storeDraft}
              onChange={(e) => setStoreDraft(e.target.value)}
              placeholder="Store name, like Aldi"
              autoComplete="off"
              className="h-10 rounded-full border-white/30 bg-white/10 px-4 text-white placeholder:text-white/50"
            />
            <Button type="submit" variant="secondary" className="h-10 rounded-full px-4" disabled={!storeDraft.trim()}>
              Add store
            </Button>
          </form>
        )}

        {compare.priced.length > 0 && (
          <div className="space-y-2 rounded-2xl bg-white/10 px-3 py-3 text-sm">
            <ul className="space-y-1">
              {compare.totals.map((t) => (
                <li key={t.store.id} className="flex items-baseline justify-between gap-3">
                  <span className={cn(compare.best?.store.id === t.store.id && "font-bold text-lime")}>
                    {t.store.name}
                    {t.missing > 0 && (
                      <span className="text-xs text-white/60"> · {t.missing} price{t.missing > 1 ? "s" : ""} missing</span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums">{money(t.total)}</span>
                </li>
              ))}
            </ul>
            {compare.best ? (
              <p className="border-t border-white/15 pt-2 leading-6">
                <span className="font-bold text-lime">{compare.best.store.name}</span> is cheapest for this list
                {compare.savings > 0 ? `, saving ${money(compare.savings)}` : ""}.
                {state.stores.length > 1 && compare.split < compare.best.total - 0.005 && (
                  <> Buying each item where it&apos;s cheapest: {money(compare.split)}.</>
                )}
              </p>
            ) : compare.tie ? (
              <p className="border-t border-white/15 pt-2 leading-6">
                It&apos;s a tie for this list.
                {compare.split < compare.totals[0].total - 0.005 && (
                  <> Buying each item where it&apos;s cheapest: {money(compare.split)}.</>
                )}
              </p>
            ) : (
              <p className="border-t border-white/15 pt-2 text-white/70">
                Fill in a price at at least two stores for every priced item to see the winner.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
