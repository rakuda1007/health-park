import type { DailyReflectionEntry } from "@/lib/db/types";

/** 今日を含む直近 n 日の ISO 開始日（YYYY-MM-DD） */
export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** IndexedDB・バックアップから読み込んだ行を現行形式に正規化する */
export function normalizeDailyReflectionEntry(
  x: unknown,
): DailyReflectionEntry | null {
  if (!isRecord(x)) {
    return null;
  }
  if (
    typeof x.id !== "string" ||
    typeof x.date !== "string" ||
    typeof x.createdAt !== "string" ||
    typeof x.updatedAt !== "string"
  ) {
    return null;
  }

  const comment = typeof x.comment === "string" ? x.comment.trim() : "";
  if (!comment) {
    return null;
  }

  return {
    id: x.id,
    date: x.date,
    comment,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

export function hasReflectionComment(entry: DailyReflectionEntry): boolean {
  return entry.comment.trim().length > 0;
}

export function filterReflectionsSince(
  entries: DailyReflectionEntry[],
  sinceIso: string,
): DailyReflectionEntry[] {
  return entries.filter((e) => e.date >= sinceIso);
}
