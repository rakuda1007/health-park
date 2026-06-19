"use client";

import type { MealItemMaster, MealSetMaster, MealSlot } from "@/lib/db/types";
import {
  appendFoodItem,
  foodsFromSet,
  mealMasterMatchesSlot,
} from "@/lib/meal-foods";
import { useMemo, useState } from "react";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "朝",
  lunch: "昼",
  dinner: "晩",
};

type Props = {
  slot: MealSlot;
  items: string[];
  onItemsChange: (items: string[]) => void;
  itemMasters: MealItemMaster[];
  setMasters: MealSetMaster[];
  onItemMasterUsed: (master: MealItemMaster) => void;
  onSetMasterUsed: (master: MealSetMaster) => void;
};

export function MealQuickInput({
  slot,
  items,
  onItemsChange,
  itemMasters,
  setMasters,
  onItemMasterUsed,
  onSetMasterUsed,
}: Props) {
  const [freeText, setFreeText] = useState("");

  const visibleSets = useMemo(
    () => setMasters.filter((m) => mealMasterMatchesSlot(m.slot, slot)),
    [setMasters, slot],
  );
  const visibleItems = useMemo(
    () => itemMasters.filter((m) => mealMasterMatchesSlot(m.slot, slot)),
    [itemMasters, slot],
  );

  function handleSelectSet(master: MealSetMaster) {
    const next = foodsFromSet(master.foods);
    if (items.length > 0) {
      const ok = window.confirm(
        `「${master.label}」を選ぶと、いまの内容は置き換わります。よろしいですか？`,
      );
      if (!ok) {
        return;
      }
    }
    onItemsChange(next);
    onSetMasterUsed(master);
  }

  function handleSelectItem(master: MealItemMaster) {
    onItemsChange(appendFoodItem(items, master.label));
    onItemMasterUsed(master);
  }

  function handleAddFree() {
    const trimmed = freeText.trim();
    if (!trimmed) {
      return;
    }
    onItemsChange(appendFoodItem(items, trimmed));
    setFreeText("");
  }

  function handleRemove(index: number) {
    onItemsChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {visibleSets.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-[color:var(--hp-muted)]">
            セット（{SLOT_LABEL[slot]}）
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleSets.map((master) => (
              <button
                key={master.id}
                type="button"
                onClick={() => handleSelectSet(master)}
                className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-1.5 text-sm text-[color:var(--hp-foreground)] hover:border-[color:var(--hp-accent)]"
              >
                {master.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-[color:var(--hp-muted)]">
            一品を追加
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleItems.map((master) => (
              <button
                key={master.id}
                type="button"
                onClick={() => handleSelectItem(master)}
                className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-1.5 text-sm text-[color:var(--hp-foreground)] hover:border-[color:var(--hp-accent)]"
              >
                {master.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-medium text-[color:var(--hp-muted)]">
          その他を追加
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFree();
              }
            }}
            placeholder="例: しゃけ"
            className="min-w-[8rem] flex-1 rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
          <button
            type="button"
            onClick={handleAddFree}
            className="rounded-lg border border-[color:var(--hp-border)] px-3 py-2 text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            追加
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[color:var(--hp-muted)]">
          食べたもの
        </p>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            セット・一品・その他から選ぶか、下の定番を登録してください。
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-2.5 py-1 text-sm text-[color:var(--hp-foreground)]">
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`${item} を削除`}
                    className="ml-0.5 text-[color:var(--hp-muted)] hover:text-red-600 dark:hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
