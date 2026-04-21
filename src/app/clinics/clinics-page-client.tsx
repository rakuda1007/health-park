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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function resetForm() {
    setEditingId(null);
    setName("");
    setAddress("");
    setPhone("");
    setNote("");
  }

  function beginEdit(row: ClinicEntry) {
    setLoadError(null);
    setEditingId(row.id);
    setName(row.name);
    setAddress(row.address ?? "");
    setPhone(row.phone ?? "");
    setNote(row.note ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "") {
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
        await putClinicEntry({
          ...existing,
          name: name.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
        });
        resetForm();
      } else {
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
        resetForm();
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この通院先を削除しますか？")) {
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await deleteClinicEntry(id);
    await load();
  }

  const isEditing = editingId != null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        病院
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        病院・クリニック名に加え、住所と電話番号をメモできます（手入力のみ）。
      </p>

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
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      beginEdit(row);
                      window.requestAnimationFrame(() => {
                        document
                          .getElementById("clinic-form")
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
        id="clinic-form"
        onSubmit={handleSubmit}
        className="mt-10 scroll-mt-24 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          {isEditing ? "編集" : "新規登録"}
        </h2>
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
