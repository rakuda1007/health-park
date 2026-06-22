"use client";

import {
  deleteMealItemMaster,
  deleteMealSetMaster,
  listMealItemMasters,
  listMealSetMasters,
  putMealItemMaster,
  putMealSetMaster,
} from "@/lib/db";
import type {
  MealItemMaster,
  MealMasterSlot,
  MealSetMaster,
} from "@/lib/db/types";
import { normalizeFoodsText } from "@/lib/meal-foods";
import { useCallback, useEffect, useState } from "react";

const SLOT_OPTIONS: { value: MealMasterSlot; label: string }[] = [
  { value: "any", label: "共通（朝昼晩）" },
  { value: "breakfast", label: "朝のみ" },
  { value: "lunch", label: "昼のみ" },
  { value: "dinner", label: "晩のみ" },
];

function nextSortOrder(rows: { sortOrder: number }[]): number {
  if (rows.length === 0) {
    return 0;
  }
  return Math.max(...rows.map((r) => r.sortOrder)) + 10;
}

type Props = {
  onMastersChange?: () => void;
};

export function MealMasterEditor({ onMastersChange }: Props) {
  const [open, setOpen] = useState(false);
  const [itemMasters, setItemMasters] = useState<MealItemMaster[]>([]);
  const [setMasters, setSetMasters] = useState<MealSetMaster[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [itemLabel, setItemLabel] = useState("");
  const [itemSlot, setItemSlot] = useState<MealMasterSlot>("any");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [setLabel, setSetLabel] = useState("");
  const [setFoods, setSetFoods] = useState("");
  const [setSlot, setSetSlot] = useState<MealMasterSlot>("any");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [items, sets] = await Promise.all([
        listMealItemMasters(),
        listMealSetMasters(),
      ]);
      setItemMasters(items);
      setSetMasters(sets);
      onMastersChange?.();
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "定番の読み込みに失敗しました",
      );
    }
  }, [onMastersChange]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  function resetItemForm() {
    setEditingItemId(null);
    setItemLabel("");
    setItemSlot("any");
  }

  function resetSetForm() {
    setEditingSetId(null);
    setSetLabel("");
    setSetFoods("");
    setSetSlot("any");
  }

  function startEditItem(row: MealItemMaster) {
    setEditingItemId(row.id);
    setItemLabel(row.label);
    setItemSlot(row.slot);
  }

  function startEditSet(row: MealSetMaster) {
    setEditingSetId(row.id);
    setSetLabel(row.label);
    setSetFoods(row.foods);
    setSetSlot(row.slot);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    const label = itemLabel.trim();
    if (!label) {
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = editingItemId
        ? itemMasters.find((r) => r.id === editingItemId)
        : null;
      await putMealItemMaster({
        id: existing?.id ?? crypto.randomUUID(),
        label,
        slot: itemSlot,
        sortOrder: existing?.sortOrder ?? nextSortOrder(itemMasters),
        lastUsedAt: existing?.lastUsedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      resetItemForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSet(e: React.FormEvent) {
    e.preventDefault();
    const label = setLabel.trim();
    const foods = normalizeFoodsText(setFoods);
    if (!label || !foods) {
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = editingSetId
        ? setMasters.find((r) => r.id === editingSetId)
        : null;
      await putMealSetMaster({
        id: existing?.id ?? crypto.randomUUID(),
        label,
        foods,
        slot: setSlot,
        sortOrder: existing?.sortOrder ?? nextSortOrder(setMasters),
        lastUsedAt: existing?.lastUsedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      resetSetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!window.confirm("この一品定番を削除しますか？")) {
      return;
    }
    await deleteMealItemMaster(id);
    if (editingItemId === id) {
      resetItemForm();
    }
    await load();
  }

  async function handleMoveItem(id: string, direction: "up" | "down") {
    const sorted = [...itemMasters].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((row) => row.id === id);
    if (index < 0) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const current = sorted[index];
    const neighbor = sorted[targetIndex];
    const now = new Date().toISOString();
    setSaving(true);
    try {
      await Promise.all([
        putMealItemMaster({
          ...current,
          sortOrder: neighbor.sortOrder,
          updatedAt: now,
        }),
        putMealItemMaster({
          ...neighbor,
          sortOrder: current.sortOrder,
          updatedAt: now,
        }),
      ]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSet(id: string) {
    if (!window.confirm("このセット定番を削除しますか？")) {
      return;
    }
    await deleteMealSetMaster(id);
    if (editingSetId === id) {
      resetSetForm();
    }
    await load();
  }

  return (
    <section className="mt-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[color:var(--hp-foreground)]"
        aria-expanded={open}
      >
        定番の登録・編集
        <span className="text-[color:var(--hp-muted)]">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="space-y-6 border-t border-[color:var(--hp-border)] px-4 py-4">
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </p>
          ) : null}

          <div>
            <h3 className="text-sm font-medium text-[color:var(--hp-foreground)]">
              一品マスタ
            </h3>
            <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
              よく使う一品（例: ごはん、卵焼き）を登録します。一覧の ↑↓
              で表示順を変更できます。
            </p>
            <form onSubmit={handleSaveItem} className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  placeholder="一品名"
                  required
                  className="min-w-[8rem] flex-1 rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
                />
                <select
                  value={itemSlot}
                  onChange={(e) =>
                    setItemSlot(e.target.value as MealMasterSlot)
                  }
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
                >
                  {SLOT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[color:var(--hp-accent)] px-3 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
                >
                  {editingItemId ? "更新" : "追加"}
                </button>
                {editingItemId ? (
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="rounded-lg border border-[color:var(--hp-border)] px-3 py-2 text-sm"
                  >
                    やめる
                  </button>
                ) : null}
              </div>
            </form>
            {itemMasters.length > 0 ? (
              <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-lg border border-[color:var(--hp-border)]">
                {itemMasters.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>
                      {row.label}
                      <span className="ml-2 text-xs text-[color:var(--hp-muted)]">
                        (
                        {SLOT_OPTIONS.find((o) => o.value === row.slot)?.label ??
                          row.slot}
                        )
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex gap-0.5">
                        <button
                          type="button"
                          disabled={saving || index === 0}
                          onClick={() => void handleMoveItem(row.id, "up")}
                          aria-label={`${row.label} を上へ`}
                          className="rounded border border-[color:var(--hp-border)] px-1.5 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={
                            saving || index === itemMasters.length - 1
                          }
                          onClick={() => void handleMoveItem(row.id, "down")}
                          aria-label={`${row.label} を下へ`}
                          className="rounded border border-[color:var(--hp-border)] px-1.5 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditItem(row)}
                        className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteItem(row.id)}
                        className="text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      >
                        削除
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
                まだ一品定番がありません。
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-[color:var(--hp-foreground)]">
              セットマスタ
            </h3>
            <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
              ワンタップで入る定番（例: 朝食抜き、もりそば＋かき揚げ）を登録します。中身は読点区切りで保存されます。
            </p>
            <form onSubmit={handleSaveSet} className="mt-3 space-y-2">
              <input
                type="text"
                value={setLabel}
                onChange={(e) => setSetLabel(e.target.value)}
                placeholder="ボタン名（例: 定番朝食）"
                required
                className="w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
              />
              <textarea
                value={setFoods}
                onChange={(e) => setSetFoods(e.target.value)}
                placeholder="中身（例: ごはん、卵焼き、みそ汁 または 朝食抜き）"
                required
                rows={2}
                className="w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={setSlot}
                  onChange={(e) => setSetSlot(e.target.value as MealMasterSlot)}
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
                >
                  {SLOT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[color:var(--hp-accent)] px-3 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
                >
                  {editingSetId ? "更新" : "追加"}
                </button>
                {editingSetId ? (
                  <button
                    type="button"
                    onClick={resetSetForm}
                    className="rounded-lg border border-[color:var(--hp-border)] px-3 py-2 text-sm"
                  >
                    やめる
                  </button>
                ) : null}
              </div>
            </form>
            {setMasters.length > 0 ? (
              <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-lg border border-[color:var(--hp-border)]">
                {setMasters.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--hp-muted)]">
                        {row.foods}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--hp-muted)]">
                        {SLOT_OPTIONS.find((o) => o.value === row.slot)?.label ??
                          row.slot}
                      </p>
                    </div>
                    <span className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditSet(row)}
                        className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSet(row.id)}
                        className="text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      >
                        削除
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
                まだセット定番がありません。
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
