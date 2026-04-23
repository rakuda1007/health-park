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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function resetForm() {
    setEditingId(null);
    setDate(todayIso());
    setWeightKg("");
    setNote("");
  }

  function beginEdit(row: WeightEntry) {
    setLoadError(null);
    setEditingId(row.id);
    setDate(row.date);
    setWeightKg(String(row.weightKg));
    setNote(row.note ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = Number.parseFloat(weightKg);
    if (Number.isNaN(w) || w <= 0) {
      return;
    }
    setSaving(true);
    setLoadError(null);
    try {
      if (editingId != null) {
        const existing = entries.find((x) => x.id === editingId);
        if (!existing) {
          setLoadError("編集対象の記録が見つかりません。一覧を再読み込みしてください。");
          return;
        }
        await putWeightEntry({
          ...existing,
          date,
          weightKg: w,
          note: note.trim() || undefined,
        });
        resetForm();
      } else {
        const now = new Date().toISOString();
        const entry: WeightEntry = {
          id: crypto.randomUUID(),
          date,
          weightKg: w,
          note: note.trim() || undefined,
          createdAt: now,
        };
        await putWeightEntry(entry);
        setEditingId(null);
        setWeightKg("");
        setNote("");
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await deleteWeightEntry(id);
    await load();
  }

  const isEditing = editingId != null;

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
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          {isEditing ? "記録を編集" : "新規記録"}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--hp-muted)]">日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--hp-muted)]">体重（kg）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="例: 65.5"
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">メモ（任意）</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
          >
            {saving ? "保存中…" : isEditing ? "更新" : "保存"}
          </button>
          {isEditing ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => resetForm()}
              className="rounded-lg border border-[color:var(--hp-border)] px-4 py-2 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-input)] disabled:opacity-60"
            >
              キャンセル
            </button>
          ) : null}
        </div>
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
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      beginEdit(row);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-sm text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row.id)}
                    className="text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
