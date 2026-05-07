"use client";

import {
  deleteDailyReflectionEntry,
  getDailyReflectionByDate,
  listDailyReflectionEntries,
  putDailyReflectionEntry,
} from "@/lib/db";
import type { DailyReflectionEntry, ReflectionRating } from "@/lib/db/types";
import { RecordingPageAd } from "@/components/recording-page-ad";
import { ratingSymbol } from "@/lib/reflection-display";
import { todayIso } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";

const RATING_OPTIONS: { value: ReflectionRating; symbol: string }[] = [
  { value: "good", symbol: "〇" },
  { value: "ok", symbol: "△" },
  { value: "bad", symbol: "✕" },
];

function defaultRatings(): Record<"meal" | "steps" | "condition", ReflectionRating> {
  return { meal: "ok", steps: "ok", condition: "ok" };
}

export function ReflectionPageClient() {
  const [date, setDate] = useState(todayIso);
  const [meal, setMeal] = useState<ReflectionRating>("ok");
  const [stepsRating, setStepsRating] = useState<ReflectionRating>("ok");
  const [condition, setCondition] = useState<ReflectionRating>("ok");
  const [comment, setComment] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allRows, setAllRows] = useState<DailyReflectionEntry[]>([]);

  const loadList = useCallback(async () => {
    try {
      setListError(null);
      const list = await listDailyReflectionEntries();
      setAllRows(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "一覧の読み込みに失敗しました");
    }
  }, []);

  const loadForDate = useCallback(async (d: string) => {
    try {
      setLoadError(null);
      const r = await getDailyReflectionByDate(d);
      if (r) {
        setLoadedId(r.id);
        setMeal(r.mealRating);
        setStepsRating(r.stepsRating);
        setCondition(r.conditionRating);
        setComment(r.comment ?? "");
      } else {
        setLoadedId(null);
        const defs = defaultRatings();
        setMeal(defs.meal);
        setStepsRating(defs.steps);
        setCondition(defs.condition);
        setComment("");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadForDate(date);
  }, [date, loadForDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = await getDailyReflectionByDate(date);
      const id = existing?.id ?? crypto.randomUUID();
      const createdAt = existing?.createdAt ?? now;
      await putDailyReflectionEntry({
        id,
        date,
        mealRating: meal,
        stepsRating,
        conditionRating: condition,
        comment: comment.trim() || undefined,
        createdAt,
        updatedAt: existing?.updatedAt ?? now,
      });
      setLoadedId(id);
      await loadForDate(date);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!loadedId) {
      return;
    }
    if (!window.confirm("この日の振り返りを削除しますか？")) {
      return;
    }
    await deleteDailyReflectionEntry(loadedId);
    setLoadedId(null);
    const defs = defaultRatings();
    setMeal(defs.meal);
    setStepsRating(defs.steps);
    setCondition(defs.condition);
    setComment("");
    await loadForDate(date);
    await loadList();
  }

  function editRow(iso: string) {
    setDate(iso);
    requestAnimationFrame(() => {
      document.getElementById("reflection-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        一日の振り返り
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        食事・歩数・体調を〇・△・✕で記録します。前日分を翌日に入力する場合は日付を変えてください。
      </p>

      <form
        id="reflection-form"
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">対象の日付</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>

        <RatingBlock
          title="食事（その日の食事全体）"
          value={meal}
          onChange={setMeal}
        />
        <RatingBlock
          title="歩数"
          value={stepsRating}
          onChange={setStepsRating}
        />
        <RatingBlock
          title="体調"
          value={condition}
          onChange={setCondition}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">一言コメント（任意）</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="今日の感想など"
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          {loadedId ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-[color:var(--hp-border)] px-4 py-2 text-sm text-red-600 dark:text-red-400"
            >
              この日の振り返りを削除
            </button>
          ) : null}
        </div>
      </form>

      <RecordingPageAd />

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-10" aria-labelledby="reflection-list-heading">
        <h2
          id="reflection-list-heading"
          className="text-sm font-medium text-[color:var(--hp-foreground)]"
        >
          振り返り一覧
        </h2>
        <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
          日付ごとの自己評価（食事・歩数・体調）。行を選ぶと上のフォームで編集できます。
        </p>
        {listError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {listError}
          </p>
        ) : allRows.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            まだ記録がありません。
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
                  <th className="px-3 py-2 text-xs font-medium text-[color:var(--hp-muted)]">
                    日付
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                    食事
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                    歩数
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                    体調
                  </th>
                  <th className="min-w-[8rem] px-3 py-2 text-xs font-medium text-[color:var(--hp-muted)]">
                    コメント
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-[color:var(--hp-muted)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[color:var(--hp-border)] last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[color:var(--hp-foreground)]">
                      {row.date}
                    </td>
                    <td className="px-2 py-2.5 text-center text-lg">
                      {ratingSymbol(row.mealRating)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-lg">
                      {ratingSymbol(row.stepsRating)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-lg">
                      {ratingSymbol(row.conditionRating)}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs text-[color:var(--hp-muted)]">
                      {row.comment ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => editRow(row.date)}
                        className="text-xs text-[color:var(--hp-accent)] underline"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-[color:var(--hp-muted)]">
        〇＝よかった／十分　△＝まあまあ　✕＝いまいち（主観の目安です）
      </p>
    </main>
  );
}

function RatingBlock({
  title,
  value,
  onChange,
}: {
  title: string;
  value: ReflectionRating;
  onChange: (v: ReflectionRating) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-[color:var(--hp-foreground)]">
        {title}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-w-[3rem] rounded-lg border px-3 py-2 text-center text-lg leading-none ${
              value === opt.value
                ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                : "border-[color:var(--hp-border)] bg-[color:var(--hp-background)] text-[color:var(--hp-foreground)] hover:border-[color:var(--hp-accent)]"
            }`}
            aria-pressed={value === opt.value}
          >
            <span className="sr-only">{opt.value}</span>
            {opt.symbol}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
