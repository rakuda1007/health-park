"use client";

import {
  deletePastMedicalHistoryEntry,
  listPastMedicalHistoryEntries,
  putPastMedicalHistoryEntry,
} from "@/lib/db";
import type { PastMedicalHistoryEntry } from "@/lib/db/types";
import { useCallback, useEffect, useState } from "react";

export function MedicalHistoryPageClient() {
  const [entries, setEntries] = useState<PastMedicalHistoryEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [diagnosedOn, setDiagnosedOn] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await listPastMedicalHistoryEntries();
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
    setTitle("");
    setDiagnosedOn("");
    setNote("");
  }

  function beginEdit(row: PastMedicalHistoryEntry) {
    setLoadError(null);
    setEditingId(row.id);
    setTitle(row.title);
    setDiagnosedOn(row.diagnosedOn ?? "");
    setNote(row.note ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === "") {
      return;
    }
    setSaving(true);
    setLoadError(null);
    try {
      if (editingId != null) {
        const existing = entries.find((x) => x.id === editingId);
        if (!existing) {
          setLoadError("編集対象が見つかりません。一覧を再読み込みしてください。");
          return;
        }
        await putPastMedicalHistoryEntry({
          ...existing,
          title: title.trim(),
          diagnosedOn: diagnosedOn.trim() || undefined,
          note: note.trim() || undefined,
        });
        resetForm();
      } else {
        const now = new Date().toISOString();
        const entry: PastMedicalHistoryEntry = {
          id: crypto.randomUUID(),
          title: title.trim(),
          diagnosedOn: diagnosedOn.trim() || undefined,
          note: note.trim() || undefined,
          createdAt: now,
        };
        await putPastMedicalHistoryEntry(entry);
        resetForm();
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この既往歴を削除しますか？")) {
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await deletePastMedicalHistoryEntry(id);
    await load();
  }

  const isEditing = editingId != null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        既往歴
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        病名や疾患のメモを手入力で残せます。公式な診療録ではなく、自分用の覚え書きとしてご利用ください。
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="pmh-heading">
        <h2
          id="pmh-heading"
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
                  {row.diagnosedOn ? (
                    <p className="text-sm tabular-nums text-[color:var(--hp-muted)]">
                      診断日: {row.diagnosedOn}
                    </p>
                  ) : null}
                  <span
                    className={`font-medium text-[color:var(--hp-foreground)] ${
                      row.diagnosedOn ? "mt-1 inline-block" : ""
                    }`}
                  >
                    {row.title}
                  </span>
                  {row.note ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--hp-muted)]">
                      {row.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      beginEdit(row);
                      window.requestAnimationFrame(() => {
                        document
                          .getElementById("pmh-form")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
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

      <form
        id="pmh-form"
        onSubmit={handleSubmit}
        className="mt-10 scroll-mt-24 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          {isEditing ? "編集" : "新規登録"}
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">病名・内容</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="例: 高血圧症、2型糖尿病 など"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">
            診断日・発症の目安（任意）
          </span>
          <input
            type="date"
            value={diagnosedOn}
            onChange={(e) => setDiagnosedOn(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[color:var(--hp-foreground)]"
            placeholder="治療経過や気をつけていることなど"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
          >
            {saving ? "保存中…" : isEditing ? "更新" : "登録"}
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
    </main>
  );
}
