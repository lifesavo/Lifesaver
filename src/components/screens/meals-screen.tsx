"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellPlus, ChevronLeft, ChevronRight, Copy, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExampleTag } from "@/components/demo-note";

const STORE_KEY = "lifesaver.meals.v1";
/** Same key and format the Grocery page uses, so ingredients show up there. */
const GROCERY_KEY = "lifesaver.grocery.v1";
const KEEP_WEEKS = 26;
const MAX_MEALS = 60;

type Meal = { id: string; name: string; ingredients: string[] };
type SlotId = "breakfast" | "lunch" | "dinner";
/** weeks[mondayKey]["<dayIndex>-<slot>"] = meal id */
type Store = { meals: Meal[]; weeks: Record<string, Record<string, string>> };

const EMPTY: Store = { meals: [], weeks: {} };

const SLOTS: { id: SlotId; label: string; time: string }[] = [
  { id: "breakfast", label: "Breakfast", time: "08:00" },
  { id: "lunch", label: "Lunch", time: "12:00" },
  { id: "dinner", label: "Dinner", time: "18:00" },
];

const EXAMPLE_MEALS: { name: string; ingredients: string[] }[] = [
  { name: "Scrambled eggs & toast", ingredients: ["Eggs", "Bread", "Butter"] },
  { name: "Turkey sandwiches", ingredients: ["Bread", "Sliced turkey", "Cheese", "Lettuce"] },
  { name: "Spaghetti night", ingredients: ["Spaghetti", "Pasta sauce", "Ground beef", "Parmesan"] },
  { name: "Chicken tacos", ingredients: ["Chicken", "Tortillas", "Salsa", "Shredded cheese", "Lettuce"] },
];

type GroceryItem = { id: string; name: string; qty: number; done: boolean; prices: Record<string, number> };

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

/** Monday of the week containing d. */
function mondayOf(d: Date) {
  const back = (d.getDay() + 6) % 7;
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back));
}

function shiftDay(key: string, days: number) {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

function shortDate(key: string) {
  return parseKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekday(key: string) {
  return parseKey(key).toLocaleDateString(undefined, { weekday: "long" });
}

function cleanName(v: string, max = 60) {
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

function splitIngredients(text: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const c = cleanName(part);
    if (c && !seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase());
      out.push(c);
    }
  }
  return out.slice(0, 30);
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Adds names to the Grocery list in its own saved format. Skips anything already on the list to buy. */
function addToGrocery(names: string[]) {
  let raw: { items?: unknown; stores?: unknown } = {};
  try {
    const text = localStorage.getItem(GROCERY_KEY);
    if (text) raw = JSON.parse(text) ?? {};
  } catch {
    raw = {};
  }
  const items: GroceryItem[] = Array.isArray(raw.items)
    ? (raw.items as GroceryItem[]).filter((i) => typeof i?.id === "string" && typeof i?.name === "string")
    : [];
  const stores = Array.isArray(raw.stores) ? raw.stores : [];
  let added = 0;
  let already = 0;
  const fresh: GroceryItem[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    const existing = items.find((i) => i.name.toLowerCase() === lower) ?? fresh.find((i) => i.name.toLowerCase() === lower);
    if (existing) {
      if (existing.done) {
        existing.done = false;
        added += 1;
      } else already += 1;
      continue;
    }
    fresh.push({ id: newId(), name, qty: 1, done: false, prices: {} });
    added += 1;
  }
  try {
    localStorage.setItem(GROCERY_KEY, JSON.stringify({ items: [...fresh, ...items], stores }));
  } catch {
    return null;
  }
  return { added, already };
}

function downloadWeek(week: string, plan: Record<string, string>, meals: Meal[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LifeSaver//Meals//EN"];
  for (let day = 0; day < 7; day++) {
    const date = shiftDay(week, day).replace(/-/g, "");
    for (const slot of SLOTS) {
      const meal = meals.find((m) => m.id === plan[`${day}-${slot.id}`]);
      if (!meal) continue;
      const title = `${slot.label}: ${meal.name}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${newId()}@lifesaver`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${date}T${slot.time.replace(":", "")}00`,
        "DURATION:PT30M",
        `SUMMARY:${icsEscape(title)}`,
        `DESCRIPTION:${icsEscape(meal.ingredients.length ? `${meal.ingredients.join(", ")}\nFrom LifeSaver Meals` : "From LifeSaver Meals")}`,
      );
      if (slot.id === "dinner") {
        lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(`Start cooking: ${meal.name}`)}`, "TRIGGER:-PT45M", "END:VALARM");
      }
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `meals-week-of-${week}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function MealsScreen() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [thisWeek, setThisWeek] = useState("");
  const [week, setWeek] = useState("");
  const [picking, setPicking] = useState(""); // "<day>-<slot>" being filled
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState("");
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const monday = mondayOf(new Date());
    setThisWeek(monday);
    setWeek(monday);
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Store) : null;
      if (parsed && Array.isArray(parsed.meals) && parsed.weeks && typeof parsed.weeks === "object") {
        const keep = shiftDay(monday, -7 * KEEP_WEEKS);
        const weeks = Object.fromEntries(Object.entries(parsed.weeks).filter(([k]) => k >= keep));
        setStore({ meals: parsed.meals.filter((m) => typeof m?.id === "string" && typeof m?.name === "string"), weeks });
      }
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

  const plan = useMemo(() => store.weeks[week] ?? {}, [store.weeks, week]);
  const lastPlan = store.weeks[week ? shiftDay(week, -7) : ""] ?? {};
  const mealById = (id: string | undefined) => store.meals.find((m) => m.id === id);
  const filled = Object.values(plan).filter((id) => mealById(id)).length;

  const weekIngredients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const id of Object.values(plan)) {
      const meal = store.meals.find((m) => m.id === id);
      for (const ing of meal?.ingredients ?? []) if (!seen.has(ing.toLowerCase())) seen.set(ing.toLowerCase(), ing);
    }
    return [...seen.values()];
  }, [plan, store.meals]);

  function setSlot(slotKey: string, mealId: string) {
    setStore((s) => {
      const next = { ...(s.weeks[week] ?? {}) };
      if (mealId) next[slotKey] = mealId;
      else delete next[slotKey];
      return { ...s, weeks: { ...s.weeks, [week]: next } };
    });
    setPicking("");
  }

  function copyLastWeek() {
    const valid = Object.fromEntries(Object.entries(lastPlan).filter(([, id]) => mealById(id)));
    if (!Object.keys(valid).length) {
      setNote("Nothing planned last week to copy.");
      return;
    }
    if (filled && !window.confirm("Replace this week's plan with last week's?")) return;
    setStore((s) => ({ ...s, weeks: { ...s.weeks, [week]: valid } }));
    setNote("Copied last week's meals.");
  }

  function clearWeek() {
    if (!filled || !window.confirm("Clear every meal this week?")) return;
    setStore((s) => ({ ...s, weeks: { ...s.weeks, [week]: {} } }));
    setNote("Week cleared.");
  }

  function sendToGrocery() {
    if (!weekIngredients.length) {
      setNote("Plan some meals with ingredients first.");
      return;
    }
    const r = addToGrocery(weekIngredients);
    if (!r) setNote("Couldn't save to the Grocery list on this phone.");
    else if (!r.added) setNote("Everything is already on your Grocery list.");
    else setNote(`Added ${r.added} to your Grocery list${r.already ? ` (${r.already} already there)` : ""}.`);
  }

  function resetForm() {
    setName("");
    setIngredients("");
    setEditId("");
  }

  function saveMeal(e: React.FormEvent) {
    e.preventDefault();
    const n = cleanName(name, 50);
    if (!n) return;
    const ings = splitIngredients(ingredients);
    if (editId) {
      setStore((s) => ({ ...s, meals: s.meals.map((m) => (m.id === editId ? { ...m, name: n, ingredients: ings } : m)) }));
      setNote(`Saved ${n}.`);
    } else {
      if (store.meals.length >= MAX_MEALS) {
        setNote(`You can save up to ${MAX_MEALS} meals.`);
        return;
      }
      const meal: Meal = { id: newId(), name: n, ingredients: ings };
      setStore((s) => ({ ...s, meals: [...s.meals, meal] }));
      if (picking) setSlot(picking, meal.id);
      setNote(`Added ${n}.`);
    }
    resetForm();
    setAdding(false);
  }

  function startEdit(m: Meal) {
    setEditId(m.id);
    setName(m.name);
    setIngredients(m.ingredients.join("\n"));
    setAdding(true);
  }

  function removeMeal(m: Meal) {
    if (!window.confirm(`Delete ${m.name}? It will come off any planned days.`)) return;
    setStore((s) => ({
      meals: s.meals.filter((x) => x.id !== m.id),
      weeks: Object.fromEntries(Object.entries(s.weeks).map(([k, p]) => [k, Object.fromEntries(Object.entries(p).filter(([, id]) => id !== m.id))])),
    }));
  }

  function addExamples() {
    setStore((s) => ({ ...s, meals: [...s.meals, ...EXAMPLE_MEALS.map((m) => ({ id: newId(), name: m.name, ingredients: [...m.ingredients] }))] }));
    setNote("Added the example meals. Edit or delete them any time.");
  }

  const pickingMeal = picking ? mealById(plan[picking]) : undefined;

  const form = (
    <form onSubmit={saveMeal} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
      <p className="font-serif text-2xl">{editId ? "Edit meal" : store.meals.length ? "Add a meal" : "Add your first meal"}</p>
      <label className="block text-xs font-semibold">
        Meal
        <Input placeholder="Like “Taco Tuesday” or “Grandma’s chili”" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
      </label>
      <label className="block text-xs font-semibold">
        Ingredients <span className="font-normal text-muted-foreground">(one per line or separated by commas)</span>
        <textarea
          placeholder={"Ground beef\nTortillas\nCheese"}
          value={ingredients}
          rows={4}
          maxLength={1200}
          onChange={(e) => setIngredients(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-full px-5" disabled={!name.trim() || !loaded}>
          <Plus className="size-4" aria-hidden="true" /> {editId ? "Save" : "Add"}
        </Button>
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
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Meals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan the week without another app. Save the meals your family actually eats, tap to fill breakfast, lunch, and dinner, copy last week, and send it all to your Grocery list.
        </p>
      </header>

      {loaded && week && (
        <section className="rounded-3xl bg-sun px-4 py-4 text-ink">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous week" onClick={() => setWeek(shiftDay(week, -7))} className="grid size-9 place-items-center rounded-full bg-white/70">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <div className="flex-1 text-center">
              <p className="font-serif text-2xl leading-tight">{week === thisWeek ? "This week" : week === shiftDay(thisWeek, 7) ? "Next week" : week === shiftDay(thisWeek, -7) ? "Last week" : "Week of"}</p>
              <p className="text-sm">
                {shortDate(week)} – {shortDate(shiftDay(week, 6))} · {filled} of 21 planned
              </p>
            </div>
            <button type="button" aria-label="Next week" onClick={() => setWeek(shiftDay(week, 7))} className="grid size-9 place-items-center rounded-full bg-white/70">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={copyLastWeek} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/80 text-sm font-semibold">
              <Copy className="size-4" aria-hidden="true" /> Copy last week
            </button>
            <button
              type="button"
              disabled={!filled}
              onClick={() => downloadWeek(week, plan, store.meals)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/80 text-sm font-semibold disabled:opacity-50"
            >
              <BellPlus className="size-4" aria-hidden="true" /> Add to calendar
            </button>
          </div>
          <button
            type="button"
            onClick={sendToGrocery}
            disabled={!weekIngredients.length}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-semibold text-white disabled:opacity-50"
          >
            <ShoppingCart className="size-5" aria-hidden="true" /> Add {weekIngredients.length || ""} ingredient{weekIngredients.length === 1 ? "" : "s"} to Grocery list
          </button>
        </section>
      )}

      {note && (
        <p className="text-sm text-muted-foreground" role="status">
          {note}{" "}
          {note.includes("Grocery list") && (
            <Link href="/grocery" className="font-semibold text-primary underline">
              Open Grocery list
            </Link>
          )}
        </p>
      )}

      {loaded && week && (
        <section aria-label="Week plan" className="space-y-2">
          {Array.from({ length: 7 }, (_, day) => {
            const key = shiftDay(week, day);
            const isToday = key === dateKey(new Date());
            return (
              <div key={key} className={cn("rounded-3xl border bg-card px-3 py-3 shadow-sm", isToday && "border-primary ring-2 ring-primary/30")}>
                <p className="px-1 text-sm font-bold">
                  {weekday(key)} <span className="font-normal text-muted-foreground">{shortDate(key)}</span>
                  {isToday && <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-ink uppercase">Today</span>}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SLOTS.map((slot) => {
                    const slotKey = `${day}-${slot.id}`;
                    const meal = mealById(plan[slotKey]);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPicking(picking === slotKey ? "" : slotKey)}
                        aria-pressed={picking === slotKey}
                        className={cn(
                          "min-h-16 rounded-2xl px-2 py-2 text-left",
                          meal ? "bg-mint text-ink" : "border border-dashed bg-secondary/50 text-muted-foreground",
                          picking === slotKey && "ring-2 ring-primary",
                        )}
                      >
                        <span className="block text-[10px] font-bold tracking-wide uppercase">{slot.label}</span>
                        <span className="block text-sm leading-tight font-semibold">{meal ? meal.name : "+ Add"}</span>
                      </button>
                    );
                  })}
                </div>
                {picking.startsWith(`${day}-`) && (
                  <div className="mt-2 rounded-2xl bg-secondary px-3 py-3">
                    <div className="flex items-center">
                      <p className="text-xs font-semibold">Pick a meal for {SLOTS.find((s) => picking.endsWith(s.id))?.label.toLowerCase()}</p>
                      <button type="button" aria-label="Close" onClick={() => setPicking("")} className="ml-auto">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    {store.meals.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">No saved meals yet. Add one below.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {store.meals.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSlot(picking, m.id)}
                            className={cn("h-9 rounded-full px-3 text-sm font-semibold", pickingMeal?.id === m.id ? "bg-primary text-primary-foreground" : "bg-card")}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex gap-3 text-sm">
                      <button type="button" className="font-semibold text-primary underline" onClick={() => { resetForm(); setAdding(true); }}>
                        + New meal
                      </button>
                      {pickingMeal && (
                        <button type="button" className="font-semibold underline" onClick={() => setSlot(picking, "")}>
                          Leave empty
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filled > 0 && (
            <button type="button" onClick={clearWeek} className="text-sm font-semibold text-muted-foreground underline">
              Clear this week
            </button>
          )}
        </section>
      )}

      {loaded && adding && form}

      {loaded && (
        <section className="space-y-2">
          <div className="flex items-center">
            <h2 className="font-serif text-2xl tracking-tight">Your meals</h2>
            {!adding && (
              <button type="button" className="ml-auto text-sm font-semibold underline" onClick={() => { resetForm(); setAdding(true); }}>
                + Add
              </button>
            )}
          </div>
          {store.meals.length === 0 ? (
            <div className="rounded-3xl border border-dashed px-4 py-4">
              <p className="text-sm font-semibold">
                Need a starting point? <ExampleTag className="ml-1 align-middle" />
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {EXAMPLE_MEALS.map((m) => (
                  <li key={m.name}>
                    <span className="font-semibold text-foreground">{m.name}</span> · {m.ingredients.join(", ")}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">These are just examples, not recommendations. Add them to edit and make them yours, or add your own meals.</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" className="h-10 rounded-full px-4" onClick={addExamples}>
                  Use these examples
                </Button>
                {!adding && (
                  <Button type="button" className="h-10 rounded-full px-4" onClick={() => { resetForm(); setAdding(true); }}>
                    <Plus className="size-4" aria-hidden="true" /> My own meal
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {store.meals.map((m) => (
                <li key={m.id} className="flex items-start gap-2 rounded-3xl border bg-card px-4 py-3 shadow-sm">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => startEdit(m)}>
                    <span className="block font-semibold">{m.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{m.ingredients.length ? m.ingredients.join(", ") : "No ingredients yet · tap to add"}</span>
                  </button>
                  <button type="button" aria-label={`Delete ${m.name}`} onClick={() => removeMeal(m)} className="p-1 text-muted-foreground">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Saved on this phone only. Nothing is sent anywhere. Ingredients go to your <Link href="/grocery" className="underline">Grocery list</Link> on this phone, and anything already on the list isn&apos;t added twice. Calendar file adds each planned meal with a heads-up 45 minutes before dinner.
      </p>
    </div>
  );
}
