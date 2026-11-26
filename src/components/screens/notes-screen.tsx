"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ListChecks, NotebookPen, Pin, Plus, Search, Share2, Trash2, Undo2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORE_KEY = "lifesaver.notes.v1";
const MAX_NOTES = 500;

type NoteColor = "none" | "sun" | "lime" | "cyan" | "mint" | "gold";
type Item = { id: string; text: string; done: boolean };

type Note = {
  id: string;
  title: string;
  body: string; // plain text when not a checklist
  checklist: boolean;
  items: Item[]; // used when checklist is true
  color: NoteColor;
  label: string;
  pinned: boolean;
  created: number;
  updated: number;
};

const COLORS: { id: NoteColor; label: string; card: string; swatch: string }[] = [
  { id: "none", label: "No color", card: "bg-card", swatch: "bg-card" },
  { id: "sun", label: "Orange", card: "bg-sun/40", swatch: "bg-sun" },
  { id: "gold", label: "Yellow", card: "bg-gold/40", swatch: "bg-gold" },
  { id: "lime", label: "Green", card: "bg-lime/40", swatch: "bg-lime" },
  { id: "mint", label: "Mint", card: "bg-mint/70", swatch: "bg-mint" },
  { id: "cyan", label: "Blue", card: "bg-cyan/40", swatch: "bg-cyan" },
];

function colorCard(c: NoteColor) {
  return COLORS.find((x) => x.id === c)?.card ?? "bg-card";
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function linesOf(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]\s+|\[[ xX]?\]\s*)/, "").trim())
    .filter(Boolean);
}

/** Turn typed lines into checklist items, keeping the checkmarks on lines that didn't change. */
function toItems(text: string, prev: Item[]): Item[] {
  const pool = [...prev];
  return linesOf(text).map((line) => {
    const i = pool.findIndex((p) => p.text === line);
    if (i >= 0) {
      const [hit] = pool.splice(i, 1);
      return { ...hit, text: line };
    }
    return { id: newId(), text: line, done: false };
  });
}

function noteText(n: Note) {
  const body = n.checklist ? n.items.map((it) => `${it.done ? "☑" : "☐"} ${it.text}`).join("\n") : n.body;
  return [n.title.trim(), body.trim()].filter(Boolean).join("\n\n");
}

function displayTitle(n: Note) {
  if (n.title.trim()) return n.title.trim();
  const first = n.checklist ? n.items[0]?.text : n.body.split(/\r?\n/).find((l) => l.trim());
  return first?.trim() || "Untitled note";
}

function edited(ts: number, now: number) {
  const mins = Math.round((now - ts) / 60000);
  if (mins < 1) return "Edited just now";
  if (mins < 60) return `Edited ${mins} min ago`;
  const d = new Date(ts);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  if (sameDay) return `Edited ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  return `Edited ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" })}`;
}

function NoteCard({
  n,
  now,
  onEdit,
  onPin,
  onDelete,
  onToggleItem,
}: {
  n: Note;
  now: number;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onToggleItem: (itemId: string) => void;
}) {
  const [status, setStatus] = useState("");
  const done = n.items.filter((i) => i.done).length;

  async function share() {
    const text = noteText(n);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: displayTitle(n), text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Share sheet unavailable; fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Couldn't copy");
    }
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <li className={cn("rounded-3xl border px-4 py-3 shadow-sm", colorCard(n.color))}>
      <div className="flex items-start gap-2">
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left" aria-label={`Edit ${displayTitle(n)}`}>
          <p className="font-semibold break-words">{displayTitle(n)}</p>
        </button>
        <button
          type="button"
          onClick={onPin}
          aria-pressed={n.pinned}
          aria-label={n.pinned ? `Unpin ${displayTitle(n)}` : `Pin ${displayTitle(n)}`}
          className={cn("p-1", n.pinned ? "text-primary" : "text-muted-foreground")}
        >
          <Pin className={cn("size-4", n.pinned && "fill-current")} aria-hidden="true" />
        </button>
      </div>

      {n.checklist ? (
        <ul className="mt-1 space-y-1">
          {n.items.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => onToggleItem(it.id)} aria-pressed={it.done} className="flex w-full items-start gap-2 text-left text-sm">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                    it.done ? "border-primary bg-primary text-primary-foreground" : "border-ink/30",
                  )}
                >
                  {it.done ? <Check className="size-3.5" aria-hidden="true" /> : null}
                </span>
                <span className={cn("break-words", it.done && "line-through opacity-60")}>{it.text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : n.body.trim() && (n.title.trim() || n.body.trim().split(/\r?\n/).length > 1) ? (
        <button type="button" onClick={onEdit} className="mt-1 block w-full text-left">
          <p className="line-clamp-6 text-sm break-words whitespace-pre-wrap">{n.title.trim() ? n.body.trim() : n.body.trim().split(/\r?\n/).slice(1).join("\n").trim()}</p>
        </button>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {n.label ? <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-semibold">#{n.label}</span> : null}
        <span className="text-xs text-muted-foreground">
          {n.checklist && n.items.length ? `${done}/${n.items.length} done · ` : ""}
          {edited(n.updated, now)}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={share} className="inline-flex h-8 items-center gap-1 rounded-full bg-background/70 px-3 text-xs font-semibold">
            <Share2 className="size-3.5" aria-hidden="true" /> {status || "Share"}
          </button>
          <button type="button" onClick={onDelete} aria-label={`Delete ${displayTitle(n)}`} className="p-1 text-muted-foreground">
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
    </li>
  );
}

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [lastDeleted, setLastDeleted] = useState<Note | null>(null);

  // Editor state. editing === null means closed, "" means a new note.
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [checklist, setChecklist] = useState(false);
  const [color, setColor] = useState<NoteColor>("none");
  const [label, setLabel] = useState("");
  const editorRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setNow(Date.now());
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Note[]) : null;
      if (Array.isArray(parsed)) setNotes(parsed);
    } catch {
      // Start fresh if storage is unavailable or corrupted.
    }
    setLoaded(true);
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(notes));
    } catch {
      // Storage full or blocked; still works for this visit.
    }
  }, [notes, loaded]);

  const editingNote = editing ? notes.find((n) => n.id === editing) ?? null : null;

  function openEditor(n: Note | null) {
    setEditing(n ? n.id : "");
    setTitle(n?.title ?? "");
    setBody(n ? (n.checklist ? n.items.map((i) => i.text).join("\n") : n.body) : "");
    setChecklist(n?.checklist ?? false);
    setColor(n?.color ?? "none");
    setLabel(n?.label ?? "");
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function closeEditor() {
    setEditing(null);
    setTitle("");
    setBody("");
    setChecklist(false);
    setColor("none");
    setLabel("");
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    const ts = Date.now();
    const cleanLabel = label.trim().replace(/^#+/, "").slice(0, 24);
    if (editingNote) {
      setNotes((list) =>
        list.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: title.trim(),
                body: checklist ? "" : body,
                checklist,
                items: checklist ? toItems(body, n.items) : [],
                color,
                label: cleanLabel,
                updated: ts,
              }
            : n,
        ),
      );
    } else {
      const n: Note = {
        id: newId(),
        title: title.trim(),
        body: checklist ? "" : body,
        checklist,
        items: checklist ? toItems(body, []) : [],
        color,
        label: cleanLabel,
        pinned: false,
        created: ts,
        updated: ts,
      };
      setNotes((list) => [n, ...list].slice(0, MAX_NOTES));
    }
    setNow(ts);
    closeEditor();
  }

  function remove(n: Note) {
    setLastDeleted(n);
    setNotes((list) => list.filter((x) => x.id !== n.id));
    if (editing === n.id) closeEditor();
  }

  function togglePin(id: string) {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  }

  function toggleItem(noteId: string, itemId: string) {
    const ts = Date.now();
    setNotes((list) =>
      list.map((n) =>
        n.id === noteId ? { ...n, updated: ts, items: n.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) } : n,
      ),
    );
    setNow(ts);
  }

  const labels = useMemo(() => Array.from(new Set(notes.map((n) => n.label).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [notes]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !labelFilter || n.label === labelFilter)
      .filter((n) => !q || [n.title, n.body, n.label, ...n.items.map((i) => i.text)].join("\n").toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);
  }, [notes, query, labelFilter]);

  const pinned = shown.filter((n) => n.pinned);
  const others = shown.filter((n) => !n.pinned);

  const editor =
    editing !== null ? (
      <form ref={editorRef} onSubmit={save} className={cn("scroll-mt-4 space-y-3 rounded-3xl border px-4 py-4 shadow-sm", colorCard(color))}>
        <div className="flex items-center gap-2">
          <p className="flex-1 font-serif text-2xl">{editingNote ? "Edit note" : "New note"}</p>
          <button type="button" onClick={closeEditor} aria-label="Close without saving" className="p-1 text-muted-foreground">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <Input
          placeholder="Title (optional)"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-2xl bg-background/70 text-base"
          aria-label="Title"
        />
        <textarea
          placeholder={checklist ? "One item per line" : "Write anything"}
          value={body}
          rows={checklist ? 6 : 8}
          maxLength={10000}
          autoFocus={!editingNote}
          onChange={(e) => setBody(e.target.value)}
          aria-label={checklist ? "Checklist items, one per line" : "Note"}
          className="w-full rounded-2xl border border-input bg-background/70 px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button
          type="button"
          aria-pressed={checklist}
          onClick={() => setChecklist((c) => !c)}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold",
            checklist ? "bg-primary text-primary-foreground" : "bg-secondary",
          )}
        >
          <ListChecks className="size-4" aria-hidden="true" /> {checklist ? "Checklist on" : "Make it a checklist"}
        </button>
        {checklist ? <p className="text-xs text-muted-foreground">Each line becomes a checkbox you can tap off.</p> : null}
        <div>
          <p className="text-xs font-semibold">Color</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2",
                  c.swatch,
                  color === c.id ? "border-ink" : "border-ink/15",
                )}
              >
                {color === c.id ? <Check className="size-4 text-ink" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-semibold">
          Label <span className="font-normal text-muted-foreground">(optional, like “work” or “recipes”)</span>
          <Input
            placeholder="No label"
            value={label}
            maxLength={24}
            list="notes-labels"
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 h-11 rounded-2xl bg-background/70 text-base"
          />
          <datalist id="notes-labels">
            {labels.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="h-11 rounded-full px-5" disabled={(!title.trim() && !body.trim()) || !loaded}>
            <Check className="size-4" aria-hidden="true" /> Save
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={closeEditor}>
            Cancel
          </Button>
          {editingNote ? (
            <Button type="button" variant="ghost" className="ml-auto h-11 rounded-full text-destructive" onClick={() => remove(editingNote)}>
              <Trash2 className="size-4" aria-hidden="true" /> Delete
            </Button>
          ) : null}
        </div>
      </form>
    ) : null;

  const section = (heading: string | null, list: Note[]) =>
    list.length ? (
      <section className="space-y-2">
        {heading ? (
          <h2 className="px-1 text-xs font-bold tracking-wide text-primary uppercase">
            {heading} · {list.length}
          </h2>
        ) : null}
        <ul className="space-y-2">
          {list.map((n) => (
            <NoteCard
              key={n.id}
              n={n}
              now={now}
              onEdit={() => openEditor(n)}
              onPin={() => togglePin(n.id)}
              onDelete={() => remove(n)}
              onToggleItem={(itemId) => toggleItem(n.id, itemId)}
            />
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jot it down before you forget. Pin the important ones, color and label them, turn a note into a checklist, and share or copy the
          text in one tap.
        </p>
      </header>

      {lastDeleted ? (
        <div className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
          <span className="flex-1 truncate">Deleted {displayTitle(lastDeleted)}.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold underline"
            onClick={() => {
              setNotes((list) => (list.some((n) => n.id === lastDeleted.id) ? list : [lastDeleted, ...list]));
              setLastDeleted(null);
            }}
          >
            <Undo2 className="size-3.5" aria-hidden="true" /> Undo
          </button>
        </div>
      ) : null}

      {editor}

      {loaded && editing === null ? (
        <section className="flex items-center gap-3 rounded-3xl bg-gold px-4 py-4 text-ink">
          <NotebookPen className="size-8 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-serif text-2xl leading-tight">
              {notes.length === 0 ? "No notes yet" : `${notes.length} note${notes.length === 1 ? "" : "s"}`}
            </p>
            <p className="text-sm">
              {notes.length === 0
                ? "Grocery codes, gift ideas, parking spot, anything."
                : `${notes.filter((n) => n.pinned).length} pinned`}
            </p>
          </div>
          <Button type="button" variant="secondary" className="h-10 rounded-full px-4" onClick={() => openEditor(null)}>
            <Plus className="size-4" aria-hidden="true" /> New
          </Button>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-full pl-9 text-base"
              aria-label="Search notes"
            />
          </div>
          {labels.length ? (
            <div className="flex flex-wrap gap-2">
              {["", ...labels].map((l) => (
                <button
                  key={l || "all"}
                  type="button"
                  aria-pressed={labelFilter === l}
                  onClick={() => setLabelFilter(l)}
                  className={cn("h-8 rounded-full px-3 text-sm font-semibold", labelFilter === l ? "bg-primary text-primary-foreground" : "bg-secondary")}
                >
                  {l ? `#${l}` : "All"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {section(pinned.length ? "Pinned" : null, pinned)}
      {section(pinned.length && others.length ? "Others" : null, others)}

      {notes.length > 0 && shown.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          No notes match{query.trim() ? ` “${query.trim()}”` : ""}
          {labelFilter ? ` in #${labelFilter}` : ""}.
        </p>
      ) : null}

      <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
        Your notes are saved only on this phone, in this browser. They aren&apos;t uploaded or synced, so clearing your browser data erases
        them. Don&apos;t keep passwords here.
      </p>
    </div>
  );
}
