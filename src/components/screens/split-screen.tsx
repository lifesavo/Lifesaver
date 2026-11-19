"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/money";

const TIP_KEY = "lifesaver.split.tip.v1";
const TIP_CHOICES = [0, 15, 18, 20, 25];
const MAX_PEOPLE = 20;

type Person = { id: string; name: string; amount: string };

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function num(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Round to cents, then hand leftover pennies out so the shares add up to the exact total. */
function fairCents(weights: number[], totalCents: number) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalCents <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / sum) * totalCents);
  const floors = raw.map(Math.floor);
  let left = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button type="button" className="size-10 rounded-full bg-muted text-xl leading-none" aria-label={`Fewer: ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button type="button" className="size-10 rounded-full bg-muted text-xl leading-none" aria-label={`More: ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}

function MoneyInput({ id, value, onChange, placeholder, className }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <span className={cn("relative block", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
      <Input id={id} type="number" inputMode="decimal" min="0" step="0.01" placeholder={placeholder ?? "0.00"} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-2xl pl-7 text-base" />
    </span>
  );
}

export function SplitScreen() {
  const [mode, setMode] = useState<"even" | "items">("even");
  const [bill, setBill] = useState("");
  const [tax, setTax] = useState("");
  const [tipPct, setTipPct] = useState(20);
  const [customTip, setCustomTip] = useState("");
  const [tipOnTax, setTipOnTax] = useState(false);
  const [people, setPeople] = useState(2);
  const [roundUp, setRoundUp] = useState(false);
  const [diners, setDiners] = useState<Person[]>([
    { id: "a", name: "Me", amount: "" },
    { id: "b", name: "", amount: "" },
  ]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TIP_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isFinite(saved) && saved >= 0 && saved <= 100 && localStorage.getItem(TIP_KEY) !== null) setTipPct(saved);
    } catch {
      // Storage blocked; default tip is fine.
    }
  }, []);

  function chooseTip(pct: number) {
    setTipPct(pct);
    setCustomTip("");
    try {
      localStorage.setItem(TIP_KEY, String(pct));
    } catch {
      // ignore
    }
  }

  const effectiveTip = customTip !== "" ? Math.min(100, num(customTip)) : tipPct;

  const result = useMemo(() => {
    const subtotal = mode === "even" ? num(bill) : diners.reduce((s, d) => s + num(d.amount), 0);
    const taxAmt = num(tax);
    const tipBase = subtotal + (tipOnTax ? taxAmt : 0);
    const tipCents = Math.round(tipBase * effectiveTip);
    const totalCents = Math.round(subtotal * 100) + Math.round(taxAmt * 100) + tipCents;

    if (mode === "even") {
      const shares = fairCents(Array.from({ length: people }, () => 1), totalCents);
      const each = people > 0 ? Math.ceil(totalCents / people) : 0;
      const rounded = Math.ceil(each / 100) * 100;
      return {
        subtotal,
        tax: taxAmt,
        tip: tipCents / 100,
        total: totalCents / 100,
        rows: shares.map((c, i) => ({ id: String(i), name: `Person ${i + 1}`, share: (roundUp ? rounded : c) / 100 })),
        roundedTotal: roundUp ? (rounded * people) / 100 : null,
      };
    }

    const weights = diners.map((d) => num(d.amount));
    const shares = fairCents(weights, totalCents);
    return {
      subtotal,
      tax: taxAmt,
      tip: tipCents / 100,
      total: totalCents / 100,
      rows: diners.map((d, i) => ({ id: d.id, name: d.name.trim() || `Person ${i + 1}`, share: (roundUp && shares[i] > 0 ? Math.ceil(shares[i] / 100) * 100 : shares[i]) / 100 })),
      roundedTotal: roundUp ? shares.reduce((s, c) => s + (c > 0 ? Math.ceil(c / 100) * 100 : 0), 0) / 100 : null,
    };
  }, [mode, bill, tax, tipOnTax, effectiveTip, people, diners, roundUp]);

  const ready = result.subtotal > 0;

  function updateDiner(id: string, patch: Partial<Person>) {
    setDiners((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function copySummary() {
    const lines = [
      `Check: ${money(result.total)} (food ${money(result.subtotal)}, tax ${money(result.tax)}, tip ${effectiveTip}% ${money(result.tip)})`,
      ...(mode === "even" ? [`${people} ways: ${money(result.rows[0]?.share ?? 0)} each`] : result.rows.map((r) => `${r.name}: ${money(r.share)}`)),
      "Split with LifeSaver",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Tip &amp; split</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Figure the tip and who owes what in seconds. Split evenly, or by what each person ordered with tax and tip shared fairly.
        </p>
      </header>

      <div role="tablist" aria-label="How to split" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["even", "items"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("rounded-full py-2 text-sm font-semibold", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {m === "even" ? "Split evenly" : "By what they ordered"}
          </button>
        ))}
      </div>

      <section className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        {mode === "even" ? (
          <>
            <label htmlFor="split-bill" className="block text-sm font-semibold">
              Bill before tax and tip
            </label>
            <MoneyInput id="split-bill" value={bill} onChange={setBill} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">People</span>
              <Stepper label="People" value={people} onChange={setPeople} min={1} max={MAX_PEOPLE} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">What each person ordered</p>
            <ul className="space-y-2">
              {diners.map((d, i) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Input
                    aria-label={`Name ${i + 1}`}
                    placeholder={`Person ${i + 1}`}
                    value={d.name}
                    maxLength={24}
                    onChange={(e) => updateDiner(d.id, { name: e.target.value })}
                    className="h-11 flex-1 rounded-2xl text-base"
                  />
                  <MoneyInput value={d.amount} onChange={(v) => updateDiner(d.id, { amount: v })} className="w-28" />
                  <button
                    type="button"
                    aria-label={`Remove ${d.name || `person ${i + 1}`}`}
                    disabled={diners.length <= 1}
                    onClick={() => setDiners((prev) => prev.filter((x) => x.id !== d.id))}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-full"
              disabled={diners.length >= MAX_PEOPLE}
              onClick={() => setDiners((prev) => [...prev, { id: newId(), name: "", amount: "" }])}
            >
              <Plus className="size-4" aria-hidden="true" /> Add person
            </Button>
            <p className="text-xs text-muted-foreground">Shared plates? Add them as a person called &quot;Shared&quot;, then split that line evenly.</p>
          </>
        )}

        <label htmlFor="split-tax" className="block text-sm font-semibold">
          Tax <span className="font-normal text-muted-foreground">(from the receipt, optional)</span>
        </label>
        <MoneyInput id="split-tax" value={tax} onChange={setTax} />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Tip</p>
          <div className="flex flex-wrap gap-2">
            {TIP_CHOICES.map((pct) => (
              <button
                key={pct}
                type="button"
                aria-pressed={customTip === "" && tipPct === pct}
                onClick={() => chooseTip(pct)}
                className={cn(
                  "h-10 min-w-14 rounded-full px-3 text-sm font-semibold",
                  customTip === "" && tipPct === pct ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {pct === 0 ? "None" : `${pct}%`}
              </button>
            ))}
            <label className="relative">
              <span className="sr-only">Custom tip percent</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                placeholder="Other"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="h-10 w-24 rounded-full pr-7 text-base"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tipOnTax} onChange={(e) => setTipOnTax(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Tip on the total after tax
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={roundUp} onChange={(e) => setRoundUp(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Round each share up to the next dollar
          </label>
        </div>
      </section>

      <section aria-live="polite" className="space-y-3 rounded-3xl bg-ink px-4 py-5 text-white">
        {ready ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-white/80">Total with tip</p>
              <p className="font-serif text-4xl tracking-tight tabular-nums">{money(result.total)}</p>
            </div>
            <p className="text-sm text-white/75">
              Food {money(result.subtotal)} · Tax {money(result.tax)} · Tip {effectiveTip}% {money(result.tip)}
            </p>
            {mode === "even" ? (
              <p className="rounded-2xl bg-white/10 px-3 py-3 text-lg">
                <span className="font-bold text-lime tabular-nums">{money(result.rows[0]?.share ?? 0)}</span> each, {people} {people === 1 ? "person" : "ways"}
                {!roundUp && result.rows.some((r) => r.share !== result.rows[0].share) && (
                  <span className="block text-xs text-white/70">Off by a penny for some, so it adds up to the exact total.</span>
                )}
              </p>
            ) : (
              <ul className="space-y-1 rounded-2xl bg-white/10 px-3 py-3">
                {result.rows.map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span>{r.name}</span>
                    <span className="font-bold text-lime tabular-nums">{money(r.share)}</span>
                  </li>
                ))}
              </ul>
            )}
            {result.roundedTotal !== null && result.roundedTotal > result.total + 0.005 && (
              <p className="text-xs text-white/70">Rounded up, the table pays {money(result.roundedTotal)} ({money(result.roundedTotal - result.total)} extra for the server).</p>
            )}
            <Button type="button" variant="secondary" className="h-10 w-full rounded-full" onClick={copySummary}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Copied, paste it in the group chat" : "Copy who owes what"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-white/80">
            {mode === "even" ? "Enter the bill to see the tip and each share." : "Enter what each person ordered to see their share."}
          </p>
        )}
      </section>
      <p className="text-xs text-muted-foreground">Everything is worked out on your phone. Nothing is saved or sent, except your favorite tip %.</p>
    </div>
  );
}
