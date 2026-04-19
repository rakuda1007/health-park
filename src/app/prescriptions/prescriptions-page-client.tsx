"use client";

import {
  deletePrescriptionEntry,
  listPrescriptionEntries,
  putPrescriptionEntry,
} from "@/lib/db";
import type { PrescriptionEntry, PrescriptionMedicine } from "@/lib/db/types";
import { splitOcrLinesForMedicines } from "@/lib/ocr/prescription-ocr";
import Image from "next/image";
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

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error ?? new Error("read error"));
    r.readAsArrayBuffer(file);
  });
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

export function PrescriptionsPageClient() {
  const [entries, setEntries] = useState<PrescriptionEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [medicines, setMedicines] = useState<MedicineDraft[]>([emptyMedicine()]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageKept, setEditingImageKept] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrError, setOcrError] = useState<string | null>(null);

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

  const previewUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of entries) {
      if (row.imageBlob && row.imageMime) {
        const blob = new Blob([row.imageBlob], { type: row.imageMime });
        map.set(row.id, URL.createObjectURL(blob));
      }
    }
    return map;
  }, [entries]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  const canRunOcr = useMemo(() => {
    if (imageFile) {
      return true;
    }
    if (editingId && editingImageKept) {
      const ex = entries.find((x) => x.id === editingId);
      return Boolean(ex?.imageBlob && ex.imageMime);
    }
    return false;
  }, [imageFile, editingId, editingImageKept, entries]);

  function resetForm() {
    setMemo("");
    setMedicines([emptyMedicine()]);
    setImageFile(null);
    setEditingId(null);
    setEditingImageKept(true);
    setOcrText("");
    setOcrError(null);
    setOcrStatus("");
    setOcrProgress(0);
  }

  function getBlobForOcr(): Blob | null {
    if (imageFile) {
      return imageFile;
    }
    if (editingId && editingImageKept) {
      const ex = entries.find((x) => x.id === editingId);
      if (ex?.imageBlob && ex.imageMime) {
        return new Blob([ex.imageBlob], { type: ex.imageMime });
      }
    }
    return null;
  }

  async function handleRunOcr() {
    const blob = getBlobForOcr();
    if (!blob) {
      window.alert(
        "先に処方箋の写真を選ぶか、画像が付いた記録を編集してください。",
      );
      return;
    }
    setOcrError(null);
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrStatus("");
    try {
      const { runPrescriptionOcr } = await import("@/lib/ocr/prescription-ocr");
      const text = await runPrescriptionOcr(blob, (info) => {
        setOcrProgress(info.progress);
        setOcrStatus(info.status);
      });
      setOcrText(text);
      if (!text) {
        window.alert(
          "文字が読み取れませんでした。明るさ・ピント・余白を確認してください。",
        );
      }
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : "OCR に失敗しました");
    } finally {
      setOcrBusy(false);
      setOcrProgress(0);
      setOcrStatus("");
    }
  }

  function applyOcrLinesToMedicines() {
    const lines = splitOcrLinesForMedicines(ocrText);
    if (lines.length === 0) {
      window.alert("読み取り結果が空です。下のテキストを確認してください。");
      return;
    }
    const hasExisting = medicines.some(
      (m) =>
        m.name.trim() !== "" ||
        m.dosage.trim() !== "" ||
        m.note.trim() !== "",
    );
    if (
      hasExisting &&
      !window.confirm(
        "現在の薬リストを、読み取り結果（改行ごと）で置き換えますか？",
      )
    ) {
      return;
    }
    setMedicines(
      lines.map((name) => ({
        id: crypto.randomUUID(),
        name,
        dosage: "",
        note: "",
      })),
    );
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
    setImageFile(null);
    setEditingImageKept(true);
    setOcrText("");
    setOcrError(null);
    setOcrStatus("");
    setOcrProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      let imageBlob: ArrayBuffer | undefined;
      let imageMime: string | undefined;

      if (imageFile) {
        imageBlob = await fileToArrayBuffer(imageFile);
        imageMime = imageFile.type || "application/octet-stream";
      }

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
        if (imageFile) {
          next.imageBlob = imageBlob;
          next.imageMime = imageMime;
        } else if (editingImageKept && existing.imageBlob && existing.imageMime) {
          next.imageBlob = existing.imageBlob;
          next.imageMime = existing.imageMime;
        }
        await putPrescriptionEntry(next);
      } else {
        const entry: PrescriptionEntry = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          medicines: meds,
          memo: memo.trim() || undefined,
        };
        if (imageBlob && imageMime) {
          entry.imageBlob = imageBlob;
          entry.imageMime = imageMime;
        }
        await putPrescriptionEntry(entry);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この処方箋データを削除しますか？（画像も削除されます）")) {
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
        写真は任意です。OCR
        はブラウザ内で実行されます（初回は言語データ取得に時間がかかることがあります）。読み取り結果は必ず確認し、薬名を修正してから保存してください。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
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

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--hp-muted)]">
            処方箋の写真（任意）
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImageFile(f ?? null);
              if (editingId) {
                setEditingImageKept(!f);
              }
            }}
            className="text-sm text-[color:var(--hp-foreground)]"
          />
          {editingId && editingImageKept && !imageFile ? (
            <span className="text-xs text-[color:var(--hp-muted)]">
              登録済みの画像をそのまま使います。差し替える場合はファイルを選んでください。
            </span>
          ) : null}
        </label>

        <div className="space-y-2 rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={ocrBusy || saving || !canRunOcr}
              onClick={() => void handleRunOcr()}
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 text-sm font-medium text-[color:var(--hp-foreground)] disabled:opacity-50"
            >
              {ocrBusy ? "読み取り中…" : "写真から文字を読み取る（OCR）"}
            </button>
            {ocrBusy && ocrStatus ? (
              <span className="text-xs text-[color:var(--hp-muted)]">
                {ocrStatus}{" "}
                {ocrProgress > 0 ? `${Math.round(ocrProgress * 100)}%` : ""}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[color:var(--hp-muted)]">
            改行ごとに1つの薬名としてリストへ反映できます。誤読が多いので必ず確認してください。
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[color:var(--hp-muted)]">
              読み取り結果（編集可）
            </span>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={6}
              placeholder="OCR 後に表示されます。手で直してから反映しても構いません。"
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-3 py-2 font-mono text-sm text-[color:var(--hp-foreground)]"
            />
          </label>
          <button
            type="button"
            disabled={ocrText.trim() === "" || saving}
            onClick={applyOcrLinesToMedicines}
            className="text-sm text-[color:var(--hp-accent)] underline disabled:opacity-50"
          >
            このテキストを薬リストに反映（改行で1行）
          </button>
          {ocrError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {ocrError}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <span className="text-sm text-[color:var(--hp-muted)]">薬の内容</span>
          {medicines.map((m, i) => (
            <div
              key={m.id}
              className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
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
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[color:var(--hp-muted)]">薬名</span>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) =>
                    updateMedicine(m.id, { name: e.target.value })
                  }
                  className="rounded border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-2 py-1.5 text-[color:var(--hp-foreground)]"
                  placeholder="例: アムロジピン錠"
                />
              </label>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                <span className="text-[color:var(--hp-muted)]">用法・用量（任意）</span>
                <input
                  type="text"
                  value={m.dosage}
                  onChange={(e) =>
                    updateMedicine(m.id, { dosage: e.target.value })
                  }
                  className="rounded border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-2 py-1.5 text-[color:var(--hp-foreground)]"
                  placeholder="例: 1日1回朝食後"
                />
              </label>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                <span className="text-[color:var(--hp-muted)]">メモ（任意）</span>
                <input
                  type="text"
                  value={m.note}
                  onChange={(e) =>
                    updateMedicine(m.id, { note: e.target.value })
                  }
                  className="rounded border border-[color:var(--hp-border)] bg-[color:var(--hp-background)] px-2 py-1.5 text-[color:var(--hp-foreground)]"
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

        <label className="flex flex-col gap-1 text-sm">
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
          <ul className="mt-3 space-y-3">
            {entries.map((row) => {
              const thumb = previewUrls.get(row.id);
              return (
                <li
                  key={row.id}
                  className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
                >
                  <div className="flex flex-wrap gap-3">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                        className="h-24 w-24 shrink-0 rounded-lg border border-[color:var(--hp-border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-[color:var(--hp-border)] text-xs text-[color:var(--hp-muted)]">
                        画像なし
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[color:var(--hp-muted)]">
                        更新:{" "}
                        {new Date(row.updatedAt).toLocaleString("ja-JP", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <ul className="mt-2 list-inside list-disc text-sm text-[color:var(--hp-foreground)]">
                        {(row.medicines ?? []).map((med) => (
                          <li key={med.id}>
                            <span className="font-medium">{med.name}</span>
                            {med.dosage ? (
                              <span className="text-[color:var(--hp-muted)]">
                                {" "}
                                — {med.dosage}
                              </span>
                            ) : null}
                            {med.note ? (
                              <span className="block text-xs text-[color:var(--hp-muted)]">
                                {med.note}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {row.memo ? (
                        <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
                          {row.memo}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-sm text-[color:var(--hp-accent)] underline"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          className="text-sm text-red-600 dark:text-red-400"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
