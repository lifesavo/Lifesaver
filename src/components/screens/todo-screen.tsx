"use client";

import { useEffect, useMemo, useState } from "react";
import { BellPlus, Check, Plus, Repeat, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORE_KEY = "lifesaver.todo.v1";
const MAX_TASKS = 300;

type RepeatKind = "none" | "daily" | "weekly" | "monthly";
type Task = { id: string; title: string; due: string; time: string; repeat: RepeatKind; done: boolean; doneAt?: number; created: number };

const REPEAT_LABEL: Record<RepeatKind, string> = { none: "Doesn't repeat", daily: "Every day", weekly: "Every week", monthly: "Every month" };

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

function addDays(key: string, days: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function addMonth(key: string) {
  const d = parseKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return dateKey(d);
}

function nextDue(task: Task, today: string) {
  let due = task.due || today;
  const step = (k: string) => (task.repeat === "daily" ? addDays(k, 1) : task.repeat === "weekly" ? addDays(k, 7) : addMonth(k));
  do {
    due = step(due);
  } while (due <= today && task.repeat !== "none");
  return due;
}

function friendlyDate(key: string, today: string) {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  const d = parseKey(key);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

function friendlyTime(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A calendar event with an alert, so the phone's own calendar does the reminding. */
function buildIcs(task: Task) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ymd = task.due.replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LifeSaver//To-do//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${task.id}@lifesaver`, `DTSTAMP:${stamp}`];
  if (task.time) {
    const hm = task.time.replace(":", "");
    const end = new Date(parseKey(task.due).getTime());
    const [h, m] = task.time.split(":").map(Number);
    end.setHours(h, m + 15, 0, 0);
    lines.push(`DTSTART:${ymd}T${hm}00`, `DTEND:${dateKey(end).replace(/-/g, "")}T${pad(end.getHours())}${pad(end.getMinutes())}00`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${addDays(task.due, 1).replace(/-/g, "")}`);
  }
  if (task.repeat !== "none") lines.push(`RRULE:FREQ=${task.repeat.toUpperCase()}`);
  lines.push(
    `SUMMARY:${icsEscape(task.title)}`,
    "DESCRIPTION:From your LifeSaver to-do list",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(task.title)}`,
    // Timed tasks alert at the time; all-day tasks alert at 9 AM that day.
    task.time ? "TRIGGER:PT0M" : "TRIGGER:PT9H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.join("\r\n") + "\r\n";
}

function downloadIcs(task: Task) {
  const blob = new Blob([buildIcs(task)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${task.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "reminder"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function doneLogEntry(task: Task): Task {
  return { ...task, id: newId(), repeat: "none", done: true, doneAt: Date.now() };
}

function TaskRow({ task, today, onToggle, onDelete }: { task: Task; today: string; onToggle: () => void; onDelete: () => void }) {
  const overdue = !task.done && task.due !== "" && task.due < today;
  return (
    <li className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
          task.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {task.done && <Check className="size-4" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-base break-words", task.done && "text-muted-foreground line-through")}>{task.title}</p>
        {(task.due || task.repeat !== "none") && (
          <p className={cn("flex flex-wrap items-center gap-x-2 text-xs", overdue ? "font-semibold text-destructive" : "text-muted-foreground")}>
            {task.due && (
              <span>
                {friendlyDate(task.due, today)}
                {task.time && ` · ${friendlyTime(task.time)}`}
              </span>
            )}
            {task.repeat !== "none" && (
              <span className="inline-flex items-center gap-1">
                <Repeat className="size-3" aria-hidden="true" />
                {REPEAT_LABEL[task.repeat]}
              </span>
            )}
          </p>
        )}
      </div>
      {!task.done && task.due && (
        <button
          type="button"
          aria-label={`Add a reminder for "${task.title}" to your calendar`}
          title="Add reminder to calendar"
          onClick={() => downloadIcs(task)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary"
        >
          <BellPlus className="size-4" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete "${task.title}"`}
        onClick={onDelete}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState<RepeatKind>("none");
  const [showDone, setShowDone] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setToday(dateKey(new Date()));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Task[]) : [];
      if (Array.isArray(parsed)) setTasks(parsed.filter((t) => t && typeof t.title === "string"));
    } catch {
      // Start fresh if storage is unavailable or corrupted.
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const tick = setInterval(() => setToday(dateKey(new Date())), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage full or blocked; the list still works for this visit.
    }
  }, [tasks, loaded]);

  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const byDue = (a: Task, b: Task) => (a.due + (a.time || "99:99")).localeCompare(b.due + (b.time || "99:99")) || a.created - b.created;
    return {
      overdue: open.filter((t) => t.due && t.due < today).sort(byDue),
      today: open.filter((t) => t.due === today).sort(byDue),
      upcoming: open.filter((t) => t.due && t.due > today).sort(byDue),
      someday: open.filter((t) => !t.due).sort((a, b) => a.created - b.created),
      done: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    };
  }, [tasks, today]);

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const clean = title.trim().slice(0, 140);
    if (!clean) return;
    if (tasks.length >= MAX_TASKS) {
      setNote("Your list is full. Clear some done tasks first.");
      return;
    }
    const dueDate = due || (time || repeat !== "none" ? today : "");
    setTasks((prev) => [...prev, { id: newId(), title: clean, due: dueDate, time, repeat, done: false, created: Date.now() }]);
    setTitle("");
    setTime("");
    setRepeat("none");
    setNote("");
  }

  function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!task.done && task.repeat !== "none") {
      // Repeating task: log this one as done and roll the task forward to its next date.
      const next = nextDue(task, today);
      const doneCopy = doneLogEntry(task);
      setTasks((prev) => [...prev.map((t) => (t.id === id ? { ...t, due: next } : t)), doneCopy]);
      setNote(`Nice. "${task.title}" is back on ${friendlyDate(next, today)}.`);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() } : t)));
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const sections: { key: keyof typeof groups; label: string; tone?: string }[] = [
    { key: "overdue", label: "Overdue", tone: "text-destructive" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Coming up" },
    { key: "someday", label: "Anytime" },
  ];
  const openCount = tasks.length - groups.done.length;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">To-do &amp; reminders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jot it down, give it a day if you want, and check it off. Repeating chores roll forward on their own, and the bell puts a reminder in your phone&apos;s calendar.
        </p>
      </header>

      <form onSubmit={addTask} className="space-y-3 rounded-3xl border bg-card px-4 py-4 shadow-sm">
        <label htmlFor="todo-title" className="sr-only">
          New task
        </label>
        <div className="flex gap-2">
          <Input
            id="todo-title"
            placeholder="Add a task, like “Take out the trash”"
            value={title}
            maxLength={140}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 flex-1 rounded-2xl text-base"
          />
          <Button type="submit" className="h-11 rounded-full px-4" disabled={!title.trim() || !today}>
            <Plus className="size-4" aria-hidden="true" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "No date", value: "" },
            { label: "Today", value: today },
            { label: "Tomorrow", value: today ? addDays(today, 1) : "" },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              aria-pressed={due === c.value}
              onClick={() => setDue(c.value)}
              className={cn("h-9 rounded-full px-3 text-sm font-semibold", due === c.value ? "bg-primary text-primary-foreground" : "bg-muted")}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold">
            Date
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
          </label>
          <label className="block text-xs font-semibold">
            Time <span className="font-normal text-muted-foreground">(optional)</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-11 rounded-2xl text-base" />
          </label>
        </div>
        <label className="block text-xs font-semibold">
          Repeat
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as RepeatKind)}
            className="mt-1 block h-11 w-full rounded-2xl border bg-background px-3 text-base"
          >
            {(Object.keys(REPEAT_LABEL) as RepeatKind[]).map((k) => (
              <option key={k} value={k}>
                {REPEAT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </form>

      {note && (
        <p aria-live="polite" className="rounded-2xl bg-lime px-4 py-2 text-sm font-semibold text-ink">
          {note}
        </p>
      )}

      {loaded && openCount === 0 && (
        <section className="rounded-3xl bg-ink px-4 py-5 text-white">
          <p className="font-serif text-2xl">All clear ✨</p>
          <p className="mt-1 text-sm text-white/80">
            {groups.done.length ? "Everything's checked off. Enjoy it." : "Nothing on your list yet. Add the first thing on your mind above."}
          </p>
        </section>
      )}

      {sections.map(({ key, label, tone }) =>
        groups[key].length ? (
          <section key={key} aria-labelledby={`todo-${key}`} className="rounded-3xl border bg-card px-4 py-3 shadow-sm">
            <h2 id={`todo-${key}`} className={cn("text-xs font-bold tracking-wide uppercase", tone ?? "text-primary")}>
              {label} · {groups[key].length}
            </h2>
            <ul className="divide-y">
              {groups[key].map((t) => (
                <TaskRow key={t.id} task={t} today={today} onToggle={() => toggle(t.id)} onDelete={() => remove(t.id)} />
              ))}
            </ul>
          </section>
        ) : null,
      )}

      {groups.done.length > 0 && (
        <section className="rounded-3xl bg-muted px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-sm font-semibold" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
              {showDone ? "Hide" : "Show"} done ({groups.done.length})
            </button>
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setTasks((prev) => prev.filter((t) => !t.done))}>
              Clear done
            </button>
          </div>
          {showDone && (
            <ul className="mt-1 divide-y">
              {groups.done.map((t) => (
                <TaskRow key={t.id} task={t} today={today} onToggle={() => toggle(t.id)} onDelete={() => remove(t.id)} />
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Your list is saved on this phone only. Nothing is sent anywhere. Reminders use your own calendar app, so they ring even when LifeSaver is closed.
      </p>
    </div>
  );
}
