"use client";

import {
  deleteClinicAppointmentEntry,
  listClinicAppointments,
  listClinicEntries,
  putClinicAppointmentEntry,
  putClinicEntry,
} from "@/lib/db";
import type {
  ClinicAppointmentEntry,
  ClinicEntry,
} from "@/lib/db/types";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-local";
import { appPath } from "@/lib/app-paths";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ClinicSource = "existing" | "new";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AppointmentsPageClient() {
  const [appointments, setAppointments] = useState<ClinicAppointmentEntry[]>(
    [],
  );
  const [clinics, setClinics] = useState<ClinicEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clinicSource, setClinicSource] = useState<ClinicSource>("existing");
  const [clinicId, setClinicId] = useState("");
  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicAddress, setNewClinicAddress] = useState("");
  const [newClinicPhone, setNewClinicPhone] = useState("");
  const [newClinicNote, setNewClinicNote] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [a, c] = await Promise.all([
        listClinicAppointments(),
        listClinicEntries(),
      ]);
      setAppointments(a);
      setClinics(c);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clinicById = useMemo(
    () => new Map(clinics.map((x) => [x.id, x] as const)),
    [clinics],
  );

  const startToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const up: ClinicAppointmentEntry[] = [];
    const pa: ClinicAppointmentEntry[] = [];
    for (const a of appointments) {
      if (new Date(a.startsAt).getTime() >= startToday) {
        up.push(a);
      } else {
        pa.push(a);
      }
    }
    up.sort((x, y) => x.startsAt.localeCompare(y.startsAt));
    pa.sort((x, y) => y.startsAt.localeCompare(x.startsAt));
    return { upcoming: up, past: pa };
  }, [appointments, startToday]);

  function resetForm() {
    setEditingId(null);
    setClinicSource(clinics.length > 0 ? "existing" : "new");
    setClinicId(clinics[0]?.id ?? "");
    setNewClinicName("");
    setNewClinicAddress("");
    setNewClinicPhone("");
    setNewClinicNote("");
    setStartsAtLocal("");
    setTitle("");
    setNote("");
  }

  function beginEdit(row: ClinicAppointmentEntry) {
    setLoadError(null);
    setEditingId(row.id);
    setClinicSource("existing");
    setClinicId(row.clinicId);
    setStartsAtLocal(isoToDatetimeLocal(row.startsAt));
    setTitle(row.title ?? "");
    setNote(row.note ?? "");
    setNewClinicName("");
    setNewClinicAddress("");
    setNewClinicPhone("");
    setNewClinicNote("");
  }

  useEffect(() => {
    if (clinics.length > 0 && !clinicId && clinicSource === "existing") {
      setClinicId(clinics[0]!.id);
    }
  }, [clinics, clinicId, clinicSource]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startsAtLocal.trim()) {
      return;
    }
    let resolvedClinicId = clinicId;
    if (clinicSource === "new") {
      if (newClinicName.trim() === "") {
        return;
      }
    } else {
      if (!resolvedClinicId) {
        setLoadError("通院先を選択するか、新規で病院を登録してください。");
        return;
      }
    }

    setSaving(true);
    setLoadError(null);
    try {
      if (clinicSource === "new") {
        const now = new Date().toISOString();
        const clinic: ClinicEntry = {
          id: crypto.randomUUID(),
          name: newClinicName.trim(),
          address: newClinicAddress.trim() || undefined,
          phone: newClinicPhone.trim() || undefined,
          note: newClinicNote.trim() || undefined,
          createdAt: now,
        };
        await putClinicEntry(clinic);
        resolvedClinicId = clinic.id;
      }

      const startsAt = datetimeLocalToIso(startsAtLocal);
      const now = new Date().toISOString();

      if (editingId != null) {
        const existing = appointments.find((x) => x.id === editingId);
        if (!existing) {
          setLoadError("編集対象が見つかりません。一覧を再読み込みしてください。");
          return;
        }
        await putClinicAppointmentEntry({
          ...existing,
          clinicId: resolvedClinicId,
          startsAt,
          title: title.trim() || undefined,
          note: note.trim() || undefined,
        });
      } else {
        const entry: ClinicAppointmentEntry = {
          id: crypto.randomUUID(),
          clinicId: resolvedClinicId,
          startsAt,
          title: title.trim() || undefined,
          note: note.trim() || undefined,
          createdAt: now,
        };
        await putClinicAppointmentEntry(entry);
      }
      resetForm();
      await load();
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "保存に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この通院予定を削除しますか？")) {
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await deleteClinicAppointmentEntry(id);
    await load();
  }

  const isEditing = editingId != null;

  function clinicLabel(id: string): string {
    return clinicById.get(id)?.name ?? "（削除された通院先）";
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        通院予定
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        登録済みの病院から通院先を選ぶか、この画面で病院を新規登録してから予定を保存できます。新規の病院は{" "}
        <Link href={appPath("/clinics")} className="text-[color:var(--hp-accent)] underline">
          病院
        </Link>
        の一覧にも表示されます。
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="appt-upcoming-heading">
        <h2
          id="appt-upcoming-heading"
          className="text-sm font-medium text-[color:var(--hp-muted)]"
        >
          これからの予定
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            予定はありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            {upcoming.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums text-[color:var(--hp-foreground)]">
                    {formatWhen(row.startsAt)}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--hp-foreground)]">
                    {clinicLabel(row.clinicId)}
                  </p>
                  {row.title ? (
                    <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
                      {row.title}
                    </p>
                  ) : null}
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
                          .getElementById("appointment-form")
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

      <section className="mt-8" aria-labelledby="appt-past-heading">
        <h2
          id="appt-past-heading"
          className="text-sm font-medium text-[color:var(--hp-muted)]"
        >
          過去の予定
        </h2>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            まだありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--hp-border)] rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]">
            {past.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm tabular-nums text-[color:var(--hp-muted)]">
                    {formatWhen(row.startsAt)}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--hp-foreground)]">
                    {clinicLabel(row.clinicId)}
                  </p>
                  {row.title ? (
                    <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
                      {row.title}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1">
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
        id="appointment-form"
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-10 scroll-mt-24 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
      >
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          {isEditing ? "予定の編集" : "新規予定"}
        </h2>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-[color:var(--hp-muted)]">
            通院先
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="clinicSource"
                checked={clinicSource === "existing"}
                disabled={clinics.length === 0}
                onChange={() => setClinicSource("existing")}
              />
              登録済みから選択
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="clinicSource"
                checked={clinicSource === "new"}
                disabled={isEditing}
                onChange={() => setClinicSource("new")}
              />
              病院を新規登録する
            </label>
          </div>
          {clinicSource === "existing" && clinics.length > 0 ? (
            <select
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            >
              {isEditing &&
              clinicId &&
              !clinics.some((c) => c.id === clinicId) ? (
                <option value={clinicId}>{clinicLabel(clinicId)}</option>
              ) : null}
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          {clinicSource === "existing" && clinics.length === 0 && !isEditing ? (
            <p className="text-sm text-[color:var(--hp-muted)]">
              病院が未登録です。「病院を新規登録する」を選ぶか、
              <Link
                href={appPath("/clinics")}
                className="text-[color:var(--hp-accent)] underline"
              >
                病院
              </Link>
              画面で先に登録してください。
            </p>
          ) : null}
          {clinicSource === "new" && !isEditing ? (
            <div className="mt-2 space-y-3 rounded-lg border border-dashed border-[color:var(--hp-border)] bg-[color:var(--hp-input)] p-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-[color:var(--hp-muted)]">病院名（必須）</span>
                <input
                  type="text"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
                  placeholder="例: ○○内科"
                  required={clinicSource === "new"}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-[color:var(--hp-muted)]">住所（任意）</span>
                <textarea
                  value={newClinicAddress}
                  onChange={(e) => setNewClinicAddress(e.target.value)}
                  rows={2}
                  className="resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-[color:var(--hp-muted)]">電話（任意）</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={newClinicPhone}
                  onChange={(e) => setNewClinicPhone(e.target.value)}
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-[color:var(--hp-muted)]">メモ（任意）</span>
                <input
                  type="text"
                  value={newClinicNote}
                  onChange={(e) => setNewClinicNote(e.target.value)}
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
                />
              </label>
            </div>
          ) : null}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">日時（必須）</span>
          <input
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">用件（任意）</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
            placeholder="例: 再診、検査"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--hp-muted)]">メモ（任意）</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="resize-y rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={
              saving ||
              (!isEditing &&
                clinicSource === "existing" &&
                clinics.length === 0) ||
              (!isEditing && clinicSource === "new" && !newClinicName.trim())
            }
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
