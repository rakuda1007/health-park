import type { IsoDate, StepsEntry } from "@/lib/db/types";

/** 同一日付が複数ある場合は updatedAt（なければ createdAt）が新しい方を採用 */
export function aggregateStepsByDate(entries: StepsEntry[]): Map<IsoDate, StepsEntry> {
  const m = new Map<IsoDate, StepsEntry>();
  for (const e of entries) {
    const prev = m.get(e.date);
    const vNew = e.updatedAt ?? e.createdAt;
    const vPrev = prev ? prev.updatedAt ?? prev.createdAt : "";
    if (!prev || vNew > vPrev) {
      m.set(e.date, e);
    }
  }
  return m;
}

export type StepsBarPoint = {
  date: IsoDate;
  /** 軸ラベル（短く） */
  label: string;
  /** 記録ありのとき歩数、未記録は null（0 ではない） */
  steps: number | null;
  recorded: boolean;
};

/** 今日を含む直近 daysBack 日分（左が古い、右が新しい） */
export function buildStepsBarSeries(
  entries: StepsEntry[],
  daysBack: number,
): StepsBarPoint[] {
  const byDate = aggregateStepsByDate(entries);
  const out: StepsBarPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${y}-${mo}-${day}` as IsoDate;
    const row = byDate.get(iso);
    out.push({
      date: iso,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      steps: row ? row.steps : null,
      recorded: Boolean(row),
    });
  }
  return out;
}

/** 指定期間内で記録がある日のみ平均（未記録日は分母・分子に含めない） */
export function averageRecordedSteps(
  entries: StepsEntry[],
  daysBack: number,
): number | null {
  const series = buildStepsBarSeries(entries, daysBack);
  const vals = series
    .filter((p) => p.recorded && p.steps != null)
    .map((p) => p.steps!);
  if (vals.length === 0) {
    return null;
  }
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 記録がある日数 */
export function countRecordedDaysInSeries(
  entries: StepsEntry[],
  daysBack: number,
): number {
  return buildStepsBarSeries(entries, daysBack).filter((p) => p.recorded).length;
}
