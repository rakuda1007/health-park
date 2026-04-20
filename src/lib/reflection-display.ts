import type { DailyReflectionEntry, ReflectionRating } from "@/lib/db/types";

export function ratingSymbol(r: ReflectionRating): string {
  switch (r) {
    case "good":
      return "〇";
    case "ok":
      return "△";
    case "bad":
      return "✕";
    default:
      return "—";
  }
}

export type RatingCounts = { good: number; ok: number; bad: number };

export function emptyRatingCounts(): RatingCounts {
  return { good: 0, ok: 0, bad: 0 };
}

export function countRatingsByAxis(
  entries: DailyReflectionEntry[],
): {
  meal: RatingCounts;
  steps: RatingCounts;
  condition: RatingCounts;
} {
  const meal = emptyRatingCounts();
  const steps = emptyRatingCounts();
  const condition = emptyRatingCounts();
  for (const e of entries) {
    meal[e.mealRating] += 1;
    steps[e.stepsRating] += 1;
    condition[e.conditionRating] += 1;
  }
  return { meal, steps, condition };
}

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

export function filterReflectionsSince(
  entries: DailyReflectionEntry[],
  sinceIso: string,
): DailyReflectionEntry[] {
  return entries.filter((e) => e.date >= sinceIso);
}
