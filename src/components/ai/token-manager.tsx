"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";

type TokenRow = { id: number; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export function TokenManager() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me/tokens")
      .then((r) => r.json())
      .then((d: { tokens?: TokenRow[] }) => setTokens(d.tokens ?? []))
      .catch(() => setError("Could not load your tokens."));
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = (await response.json()) as { ok?: boolean; message?: string; token?: string; tokens?: TokenRow[] };
      if (!response.ok || !data.token) throw new Error(data.message || "Could not create a token.");
      setFresh(data.token);
      setCopied(false);
      setTokens(data.tokens ?? []);
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a token.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    const response = await fetch(`/api/me/tokens?id=${id}`, { method: "DELETE" });
    const data = (await response.json()) as { tokens?: TokenRow[] };
    setTokens(data.tokens ?? []);
  }

  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <section id="tokens" className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-serif text-2xl">Personal access tokens</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        A token lets your own AI read and save trips on this device&apos;s LifeSaver. Public tools (gas, weather, trip ideas, roadside tips,
        giveaway) don&apos;t need one. LifeSaver stores only a scrambled hash, so copy the token now. You can revoke it any time.
      </p>
      <form className="flex gap-2" onSubmit={create}>
        <label htmlFor="token-name" className="sr-only">Token name</label>
        <input id="token-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it, e.g. My ChatGPT" maxLength={40} className="h-11 min-w-0 flex-1 rounded-full border px-4 text-base" />
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-ink px-4 text-sm font-bold text-white">
          {busy ? "…" : "Create"}
        </button>
      </form>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {fresh && (
        <div className="rounded-2xl bg-lime p-3 text-ink" role="status">
          <p className="text-xs font-bold uppercase">Copy it now. It won&apos;t be shown again.</p>
          <p className="mt-1 font-mono text-xs break-all">{fresh}</p>
          <button
            type="button"
            className="mt-2 inline-flex h-9 items-center gap-1 rounded-full bg-ink px-3 text-xs font-bold text-white"
            onClick={() => {
              void navigator.clipboard?.writeText(fresh).then(() => setCopied(true));
            }}
          >
            <Copy className="size-3.5" aria-hidden="true" /> {copied ? "Copied" : "Copy token"}
          </button>
        </div>
      )}
      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.prefix}… · made {t.createdAt.slice(0, 10)} · {t.lastUsedAt ? `last used ${t.lastUsedAt.slice(0, 10)}` : "not used yet"}
                </span>
              </span>
              <button type="button" onClick={() => void revoke(t.id)} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-destructive" aria-label={`Revoke ${t.name}`}>
                <Trash2 className="size-3.5" aria-hidden="true" /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {revoked.length > 0 && <p className="text-xs text-muted-foreground">{revoked.length} revoked token{revoked.length === 1 ? "" : "s"} no longer work.</p>}
    </section>
  );
}
