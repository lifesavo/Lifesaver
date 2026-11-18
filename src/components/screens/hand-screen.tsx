"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  offersFor,
  sampleTask,
  taskCategories,
  type PostedTask,
  type TaskCategory,
} from "@/lib/tasks";
import { money } from "@/lib/money";
import { HAND_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

const STORAGE_KEY = "lifesaver.tasks.v1";

function loadTasks(): PostedTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [sampleTask];
    const parsed = JSON.parse(raw) as PostedTask[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [sampleTask];
}

function saveTasks(next: PostedTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function HandScreen() {
  const { profile } = useProfile();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [override, setOverride] = useState<PostedTask[] | null>(null);
  const tasks = override ?? (isClient ? loadTasks() : [sampleTask]);
  const [posting, setPosting] = useState(false);
  const [category, setCategory] = useState<TaskCategory>("yard");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [whenLabel, setWhenLabel] = useState("This weekend");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const selectedId = activeId ?? tasks[0]?.id;

  if (!profile) return null;
  const unlocked = profile.plan === "hand";
  const active = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  const offers = offersFor(active.category);
  const booked = offers.find((offer) => offer.id === active.bookedOfferId);

  function postTask() {
    if (title.trim().length < 4) {
      setError("Give the job a short name.");
      return;
    }
    const task: PostedTask = {
      id: `task-${Date.now()}`,
      category,
      title: title.trim(),
      details: details.trim() || "No extra notes.",
      whenLabel,
      zip: profile?.zip ?? "",
      status: "open",
    };
    const next = [task, ...tasks];
    saveTasks(next);
    setOverride(next);
    setActiveId(task.id);
    setTitle("");
    setDetails("");
    setPosting(false);
    setError("");
  }

  function book(offerId: string) {
    const next = tasks.map((task) =>
      task.id === active.id ? { ...task, status: "booked" as const, bookedOfferId: offerId } : task,
    );
    saveTasks(next);
    setOverride(next);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Lend a Hand</h1>
          <p className="mt-1 text-sm text-muted-foreground">Odd jobs. Nearby helpers. You pick.</p>
        </div>
        <PlanChip />
      </header>
      <DemoNote>
        Sample helpers, not a live crew. Names, prices, and times are made up. A later version can
        send these tasks to Work For All. Nobody is notified from this demo.
      </DemoNote>
      {!unlocked && (
        <Link href="/pricing" className="block rounded-2xl bg-lime px-4 py-3 text-sm font-semibold text-ink">
          Helpers come with Lend a Hand, {HAND_PRICE_LABEL}/mo. That includes everything in Premium.
          You can still walk the sample flow.
        </Link>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setActiveId(task.id)}
            className={`h-10 shrink-0 rounded-full px-3 text-sm font-semibold ${
              task.id === active.id ? "bg-ink text-white" : "bg-muted"
            }`}
          >
            {task.title}
          </button>
        ))}
      </div>

      <article className="rounded-3xl border-2 border-ink/10 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-primary uppercase">
              {taskCategories.find((item) => item.id === active.category)?.label}
            </p>
            <h2 className="font-serif text-2xl">{active.title}</h2>
          </div>
          <Badge variant={active.status === "booked" ? "default" : "secondary"}>
            {active.status === "booked" ? "Booked" : "Open"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{active.details}</p>
        <p className="mt-1 text-sm font-medium">
          {active.whenLabel} · ZIP {active.zip}
        </p>
      </article>

      {active.status === "booked" && booked ? (
        <div className="rounded-3xl bg-lime px-4 py-4 text-ink" role="status">
          <p className="font-serif text-2xl">Booked.</p>
          <p className="mt-1 text-sm">
            {booked.name} is the sample helper for {money(booked.price)}. {booked.eta}. Nothing was
            sent. {unlocked ? "Lend a Hand is on in this demo." : "This is a preview."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 rounded-full border-ink bg-white"
            onClick={() => {
              const next = tasks.map((task) =>
                task.id === active.id
                  ? { ...task, status: "open" as const, bookedOfferId: undefined }
                  : task,
              );
              saveTasks(next);
              setOverride(next);
            }}
          >
            Undo booking
          </Button>
        </div>
      ) : (
        <section aria-labelledby="offers-heading" className="space-y-2">
          <h2 id="offers-heading" className="font-serif text-2xl">Helper offers</h2>
          <ul className="space-y-2">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-3xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{offer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {offer.rating} stars · {offer.jobs} sample jobs · {offer.distance}
                    </p>
                  </div>
                  <p className="font-serif text-2xl">{money(offer.price)}</p>
                </div>
                <p className="mt-2 text-sm">{offer.blurb}</p>
                <p className="text-sm text-muted-foreground">{offer.eta}</p>
                <Button type="button" className="mt-3 h-11 rounded-full" onClick={() => book(offer.id)}>
                  Book {offer.name.split(" ")[0]}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posting ? (
        <form
          className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            postTask();
          }}
        >
          <h2 className="font-serif text-2xl">Post a task</h2>
          <fieldset>
            <legend className="text-sm font-medium">What kind</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {taskCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`h-10 rounded-full px-3 text-sm font-semibold ${
                    category === item.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                  aria-pressed={category === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Job</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Mow the backyard"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-details">Details</Label>
            <Input
              id="task-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Gate code is 1234"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-when">When</Label>
            <Input
              id="task-when"
              value={whenLabel}
              onChange={(event) => setWhenLabel(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="h-12 w-full rounded-full">
            See sample offers
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full rounded-full" onClick={() => setPosting(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button type="button" className="h-14 w-full rounded-full text-base" onClick={() => setPosting(true)}>
          Lend a Hand
        </Button>
      )}
    </div>
  );
}
