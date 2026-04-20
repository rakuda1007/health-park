"use client";

import {
  deleteClinicEntry,
  listClinicEntries,
  putClinicEntry,
} from "@/lib/db";
import type { ClinicEntry } from "@/lib/db/types";
import { useCallback, useEffect, useState } from "react";

export function ClinicsPageClient() {
  const [entries, setEntries] = useState<ClinicEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listClinicEntries();
      setEntries(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: ClinicEntry = {
        id: crypto.randomUUID(),
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        createdAt: now,
      };
      await putClinicEntry(entry);
      setName("");
      setAddress("");
      setPhone("");
      setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この通院先を削除しますか？")) {
      return;
    }
    await deleteClinicEntry(id);
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        通院先
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        病院・クリニック名に加え、住所と電話番号をメモできます（手入力のみ）。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">名称</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: ○○内科クリニック"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">住所（任意）</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: 東京都○○区…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">電話番号（任意）</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: 03-1234-5678"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: かかりつけ、火曜午後"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </form>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="clinics-heading">
        <h2
          id="clinics-heading"
          className="text-sm font-medium text-[color:var(--hp-muted)]"
        >
          一覧
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            まだ登録がありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-[color:var(--hp-foreground)]">
                    {row.name}
                  </span>
                  {row.address ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--hp-foreground)]">
                      {row.address}
                    </p>
                  ) : null}
                  {row.phone ? (
                    <p className="mt-1 text-sm tabular-nums text-[color:var(--hp-foreground)]">
                      <a
                        href={`tel:${row.phone.replace(/\s/g, "")}`}
                        className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
                      >
                        {row.phone}
                      </a>
                    </p>
                  ) : null}
                  {row.note ? (
                    <span className="mt-1 block text-sm text-[color:var(--hp-muted)]">
                      {row.note}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="shrink-0 text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
