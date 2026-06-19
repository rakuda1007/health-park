"use client";

import {
  deleteMealEntry,
  listMealEntries,
  listMealItemMasters,
  listMealSetMasters,
  putMealEntry,
  putMealItemMaster,
  putMealSetMaster,
} from "@/lib/db";
import { RecordingPageAd } from "@/components/recording-page-ad";
import { MealMasterEditor } from "@/components/meal-master-editor";
import { MealQuickInput } from "@/components/meal-quick-input";
import type {
  MealEntry,
  MealItemMaster,
  MealSetMaster,
  MealSlot,
} from "@/lib/db/types";
import { joinFoods, parseFoods } from "@/lib/meal-foods";
import { todayIso } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "朝",
  lunch: "昼",
  dinner: "晩",
};

export function MealsPageClient() {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [itemMasters, setItemMasters] = useState<MealItemMaster[]>([]);
  const [setMasters, setSetMasters] = useState<MealSetMaster[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso);
  const [slot, setSlot] = useState<MealSlot>("breakfast");
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 編集中の記録 ID（null なら新規） */
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadMasters = useCallback(async () => {
    const [items, sets] = await Promise.all([
      listMealItemMasters(),
      listMealSetMasters(),
    ]);
    setItemMasters(items);
    setSetMasters(sets);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listMealEntries();
      setEntries(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
    void loadMasters();
  }, [load, loadMasters]);

  function resetForm() {
    setEditingId(null);
    setDate(todayIso());
    setSlot("breakfast");
    setFoodItems([]);
    setNote("");
    setSaveError(null);
  }

  function startEdit(row: MealEntry) {
    setEditingId(row.id);
    setDate(row.date);
    setSlot(row.slot);
    setFoodItems(parseFoods(row.foods));
    setNote(row.note);
    setSaveError(null);
  }

  async function touchItemMaster(master: MealItemMaster) {
    const now = new Date().toISOString();
    await putMealItemMaster({ ...master, lastUsedAt: now, updatedAt: now });
    await loadMasters();
  }

  async function touchSetMaster(master: MealSetMaster) {
    const now = new Date().toISOString();
    await putMealSetMaster({ ...master, lastUsedAt: now, updatedAt: now });
    await loadMasters();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const foods = joinFoods(foodItems);
    if (foods === "") {
      setSaveError("食べたものを1つ以上選ぶか追加してください。");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editingId) {
        const orig = entries.find((x) => x.id === editingId);
        if (!orig) {
          setEditingId(null);
          return;
        }
        const entry: MealEntry = {
          ...orig,
          date,
          slot,
          foods,
          note: note.trim(),
          updatedAt: now,
        };
        await putMealEntry(entry);
      } else {
        const entry: MealEntry = {
          id: crypto.randomUUID(),
          date,
          slot,
          foods,
          note: note.trim(),
          createdAt: now,
        };
        await putMealEntry(entry);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }
    await deleteMealEntry(id);
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        食事
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        朝・昼・晩ごとに食べたものを登録します。定番から選ぶか、一品ずつ追加できます。
      </p>

      <form
        onSubmit={handleSubmit}
        aria-label={editingId ? "食事記録を編集" : "食事記録を登録"}
        className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        {editingId ? (
          <p className="rounded-lg bg-[color:var(--hp-input)] px-3 py-2 text-sm text-[color:var(--hp-foreground)]">
            編集中です。内容を直して「更新」するか、「編集をやめる」で取り消せます。
          </p>
        ) : null}
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
            <span className="text-sm text-[color:var(--hp-muted)]">区分</span>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as MealSlot)}
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            >
              <option value="breakfast">{SLOT_LABEL.breakfast}</option>
              <option value="lunch">{SLOT_LABEL.lunch}</option>
              <option value="dinner">{SLOT_LABEL.dinner}</option>
            </select>
          </label>
        </div>

        <MealQuickInput
          slot={slot}
          items={foodItems}
          onItemsChange={setFoodItems}
          itemMasters={itemMasters}
          setMasters={setMasters}
          onItemMasterUsed={(master) => void touchItemMaster(master)}
          onSetMasterUsed={(master) => void touchSetMaster(master)}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">一言</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: 外食、少し多め"
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>
        {saveError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
          >
            {saving
              ? "保存中…"
              : editingId
                ? "更新"
                : "保存"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border border-[color:var(--hp-border)] px-4 py-2 text-sm font-medium text-[color:var(--hp-muted)] disabled:opacity-60"
            >
              編集をやめる
            </button>
          ) : null}
        </div>
      </form>

      <MealMasterEditor onMastersChange={() => void loadMasters()} />

      <RecordingPageAd />

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="meals-heading">
        <h2
          id="meals-heading"
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
                className={`flex flex-wrap items-start justify-between gap-2 px-4 py-3 ${
                  editingId === row.id
                    ? "bg-[color:var(--hp-input)]"
                    : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-[color:var(--hp-foreground)]">
                      {row.date}
                    </span>
                    <span className="rounded-lg bg-[color:var(--hp-border)] px-2 py-0.5 text-xs text-[color:var(--hp-foreground)]">
                      {SLOT_LABEL[row.slot]}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[color:var(--hp-foreground)]">
                    {row.foods}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
                      {row.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
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
