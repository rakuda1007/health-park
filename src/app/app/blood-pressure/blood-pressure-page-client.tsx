"use client";

import {
  deleteBloodPressureEntry,
  listBloodPressureEntries,
  putBloodPressureEntry,
} from "@/lib/db";
import { RecordingPageAd } from "@/components/recording-page-ad";
import type { BloodPressureEntry } from "@/lib/db/types";
import { todayIso } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";

export function BloodPressurePageClient() {
  const [entries, setEntries] = useState<BloodPressureEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listBloodPressureEntries();
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
    const sys = Number.parseInt(systolic, 10);
    const dia = Number.parseInt(diastolic, 10);
    if (Number.isNaN(sys) || Number.isNaN(dia) || sys <= 0 || dia <= 0) {
      return;
    }
    let pulseNum: number | undefined;
    if (pulse.trim() !== "") {
      const p = Number.parseInt(pulse, 10);
      if (Number.isNaN(p) || p <= 0) {
        return;
      }
      pulseNum = p;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: BloodPressureEntry = {
        id: crypto.randomUUID(),
        date,
        systolic: sys,
        diastolic: dia,
        pulse: pulseNum,
        note: note.trim() || undefined,
        createdAt: now,
      };
      await putBloodPressureEntry(entry);
      setSystolic("");
      setDiastolic("");
      setPulse("");
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
    await deleteBloodPressureEntry(id);
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        血圧
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        収縮期・拡張期は必須、脈拍・メモは任意です。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">日付</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--hp-muted)]">収縮期（上）</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="例: 120"
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--hp-muted)]">拡張期（下）</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="例: 80"
              required
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--hp-muted)]">脈拍（任意）</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              placeholder="例: 72"
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
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </form>

      <RecordingPageAd />

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="bp-heading">
        <h2
          id="bp-heading"
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
                    {row.systolic} / {row.diastolic} mmHg
                  </span>
                  {row.pulse != null ? (
                    <span className="ml-2 text-[color:var(--hp-muted)]">
                      脈拍 {row.pulse}
                    </span>
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
