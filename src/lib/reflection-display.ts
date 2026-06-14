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

function legacyRatingSymbol(r: unknown): string | null {
  if (r === "good") return "〇";
  if (r === "ok") return "△";
  if (r === "bad") return "✕";
  return null;
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

  let comment = typeof x.comment === "string" ? x.comment.trim() : "";
  if (!comment) {
    const legacyParts: string[] = [];
    const meal = legacyRatingSymbol(x.mealRating);
    const steps = legacyRatingSymbol(x.stepsRating);
    const condition = legacyRatingSymbol(x.conditionRating);
    if (meal) legacyParts.push(`食事${meal}`);
    if (steps) legacyParts.push(`歩数${steps}`);
    if (condition) legacyParts.push(`体調${condition}`);
    if (legacyParts.length > 0) {
      comment = legacyParts.join(" ");
    }
  }
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
