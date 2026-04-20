"use client";

import {
  deletePrescriptionEntry,
  listPrescriptionEntries,
  putPrescriptionEntry,
} from "@/lib/db";
import type { PrescriptionEntry, PrescriptionMedicine } from "@/lib/db/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type MedicineDraft = {
  id: string;
  name: string;
  dosage: string;
  note: string;
};

function emptyMedicine(): MedicineDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    dosage: "",
    note: "",
  };
}

function toMedicines(drafts: MedicineDraft[]): PrescriptionMedicine[] {
  return drafts
    .filter((d) => d.name.trim() !== "")
    .map((d) => ({
      id: d.id,
      name: d.name.trim(),
      dosage: d.dosage.trim() || undefined,
      note: d.note.trim() || undefined,
    }));
}

/** 薬名セル内の更新日時表示用 */
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * フォームの「用法・用量」1欄を一覧では用法 / 用量に分けて表示する。
 * 改行で区切った場合は1行目→用法、2行目以降→用量。1行だけなら用法に全文・用量は「—」。
 */
function splitUsageAndAmount(
  dosage: string | undefined,
): { usage: string; amount: string } {
  const raw = dosage?.trim();
  if (!raw) {
    return { usage: "—", amount: "—" };
  }
  const lines = raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return {
      usage: lines[0] ?? "—",
      amount: lines.slice(1).join("\n") || "—",
    };
  }
  return { usage: raw, amount: "—" };
}

export function PrescriptionsPageClient() {
  const [entries, setEntries] = useState<PrescriptionEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [medicines, setMedicines] = useState<MedicineDraft[]>([emptyMedicine()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listPrescriptionEntries();
      setEntries(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tableRows = useMemo(() => {
    return entries.flatMap((entry) => {
      const meds =
        entry.medicines && entry.medicines.length > 0 ? entry.medicines : [];
      return meds.map((med, medIndex) => ({
        entry,
        med,
        medIndex,
        entryMedCount: meds.length,
      }));
    });
  }, [entries]);

  function resetForm() {
    setMemo("");
    setMedicines([emptyMedicine()]);
    setEditingId(null);
  }

  function startEdit(row: PrescriptionEntry) {
    setEditingId(row.id);
    setMemo(row.memo ?? "");
    const meds = row.medicines ?? [];
    setMedicines(
      meds.length > 0
        ? meds.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage ?? "",
            note: m.note ?? "",
          }))
        : [emptyMedicine()],
    );
    requestAnimationFrame(() => {
      document.getElementById("prescription-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function updateMedicine(id: string, patch: Partial<MedicineDraft>) {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  function addMedicineRow() {
    setMedicines((prev) => [...prev, emptyMedicine()]);
  }

  function removeMedicineRow(id: string) {
    setMedicines((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((m) => m.id !== id);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const meds = toMedicines(medicines);
    if (meds.length === 0) {
      window.alert("薬名を1件以上入力してください。");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();

      if (editingId) {
        const existing = entries.find((x) => x.id === editingId);
        if (!existing) {
          return;
        }
        const next: PrescriptionEntry = {
          id: editingId,
          createdAt: existing.createdAt,
          updatedAt: now,
          medicines: meds,
          memo: memo.trim() || undefined,
        };
        await putPrescriptionEntry(next);
      } else {
        const entry: PrescriptionEntry = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          medicines: meds,
          memo: memo.trim() || undefined,
        };
        await putPrescriptionEntry(entry);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この処方箋データを削除しますか？")) {
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await deletePrescriptionEntry(id);
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        処方箋
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        薬名・用法・用量を手入力して保存します。登録済みの一覧は上に表示され、その下から追加・編集できます。
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="rx-heading">
        <h2
          id="rx-heading"
          className="text-sm font-medium text-[color:var(--hp-muted)]"
        >
          保存済み
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            まだ登録がありません。
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
                  <th
                    scope="col"
                    className="min-w-[9rem] px-3 py-2.5 text-xs font-medium text-[color:var(--hp-muted)]"
                  >
                    薬名
                  </th>
                  <th
                    scope="col"
                    className="min-w-[7rem] px-3 py-2.5 text-xs font-medium text-[color:var(--hp-muted)]"
                  >
                    用法
                  </th>
                  <th
                    scope="col"
                    className="min-w-[7rem] px-3 py-2.5 text-xs font-medium text-[color:var(--hp-muted)]"
                  >
                    用量
                  </th>
                  <th
                    scope="col"
                    className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium text-[color:var(--hp-muted)]"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(
                  ({ entry, med, medIndex, entryMedCount }) => {
                    const { usage, amount } = splitUsageAndAmount(med.dosage);
                    return (
                      <tr
                        key={`${entry.id}-${med.id}`}
                        className="border-b border-[color:var(--hp-border)]"
                      >
                        <td className="align-top px-3 py-3 text-[color:var(--hp-foreground)]">
                          <div className="font-medium leading-snug">{med.name}</div>
                          {med.note ? (
                            <p className="mt-1 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                              {med.note}
                            </p>
                          ) : null}
                          {medIndex === 0 ? (
                            <div className="mt-2 border-t border-dashed border-[color:var(--hp-border)] pt-2">
                              <p className="text-xs text-[color:var(--hp-muted)]">
                                更新
                              </p>
                              <time
                                dateTime={entry.updatedAt}
                                className="mt-0.5 block tabular-nums text-xs text-[color:var(--hp-muted)]"
                              >
                                {formatUpdatedAt(entry.updatedAt)}
                              </time>
                              {entry.memo ? (
                                <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                                  {entry.memo}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="align-top whitespace-pre-wrap px-3 py-3 text-[color:var(--hp-foreground)]">
                          {usage}
                        </td>
                        <td className="align-top whitespace-pre-wrap px-3 py-3 text-[color:var(--hp-foreground)]">
                          {amount}
                        </td>
                        {medIndex === 0 ? (
                          <td
                            rowSpan={entryMedCount}
                            className="align-top px-3 py-3 text-right"
                          >
                            <div className="inline-flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                className="text-[color:var(--hp-accent)] underline"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(entry.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form
        id="prescription-form"
        onSubmit={handleSubmit}
        className="mt-10 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <h2 className="text-sm font-medium text-[color:var(--hp-muted)]">
          {editingId ? "登録内容を編集" : "新規登録"}
        </h2>
        {editingId ? (
          <p className="text-sm text-[color:var(--hp-muted)]">
            編集中です。保存で上書きします。
            <button
              type="button"
              className="ml-2 text-[color:var(--hp-accent)] underline"
              onClick={() => resetForm()}
            >
              編集をやめる
            </button>
          </p>
        ) : null}

        <div className="space-y-4">
          <span className="text-sm font-medium text-[color:var(--hp-foreground)]">
            薬の内容
          </span>
          {medicines.map((m, i) => (
            <div
              key={m.id}
              className="space-y-3 rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[color:var(--hp-muted)]">
                  薬 {i + 1}
                </span>
                {medicines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeMedicineRow(m.id)}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    行を削除
                  </button>
                ) : null}
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[color:var(--hp-muted)]">薬名</span>
                <textarea
                  value={m.name}
                  onChange={(e) =>
                    updateMedicine(m.id, { name: e.target.value })
                  }
                  rows={2}
                  className="w-full resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 text-base leading-relaxed text-[color:var(--hp-foreground)]"
                  placeholder="例: アムロジピン錠"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[color:var(--hp-muted)]">用法・用量（任意）</span>
                <textarea
                  value={m.dosage}
                  onChange={(e) =>
                    updateMedicine(m.id, { dosage: e.target.value })
                  }
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 text-sm leading-relaxed text-[color:var(--hp-foreground)]"
                  placeholder="例: 1日1回朝食後、1回1錠"
                />
                <span className="text-xs text-[color:var(--hp-muted)]">
                  一覧表では、改行を入れると上段が「用法」、下段が「用量」になります。
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
                <textarea
                  value={m.note}
                  onChange={(e) =>
                    updateMedicine(m.id, { note: e.target.value })
                  }
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 text-sm leading-relaxed text-[color:var(--hp-foreground)]"
                  placeholder="効能・注意など"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={addMedicineRow}
            className="text-sm text-[color:var(--hp-accent)] underline"
          >
            薬を追加
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: ○○病院、2026年4月処方"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
        >
          {saving ? "保存中…" : editingId ? "更新" : "保存"}
        </button>
      </form>
    </main>
  );
}
