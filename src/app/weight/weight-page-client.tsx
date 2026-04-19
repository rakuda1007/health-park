"use client";

import {
  deleteWeightEntry,
  listWeightEntries,
  putWeightEntry,
} from "@/lib/db";
import { WeightVisualization } from "@/components/weight-visualization";
import type { WeightEntry } from "@/lib/db/types";
import { todayIso } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";

export function WeightPageClient() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso);
  const [weightKg, setWeightKg] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listWeightEntries();
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
    const w = Number.parseFloat(weightKg);
    if (Number.isNaN(w) || w <= 0) {
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: WeightEntry = {
        id: crypto.randomUUID(),
        date,
        weightKg: w,
        note: note.trim() || undefined,
        createdAt: now,
      };
      await putWeightEntry(entry);
      setWeightKg("");
      setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }
    await deleteWeightEntry(id);
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        体重
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        日付・体重（kg）を手入力して保存します。データはこの端末のブラウザ内にのみ保存されます。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[color:var(--hp-muted)]">日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[color:var(--hp-muted)]">体重（kg）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="例: 65.5"
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
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

      {!loadError && entries.length > 0 ? (
        <WeightVisualization entries={entries} />
      ) : null}

      <section className="mt-8" aria-labelledby="weight-heading">
        <h2
          id="weight-heading"
          className="text-sm font-medium text-[color:var(--hp-muted)]"
        >
          記録一覧
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            まだ記録がありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-[color:var(--hp-foreground)]">
                    {row.date}
                  </span>
                  <span className="ml-2 text-[color:var(--hp-foreground)]">
                    {row.weightKg} kg
                  </span>
                  {row.note ? (
                    <span className="mt-1 block text-sm text-[color:var(--hp-muted)]">
                      {row.note}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
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
