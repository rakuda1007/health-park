import type { WeightEntry } from "@/lib/db/types";

export type DailyWeightPoint = {
  date: string;
  weightKg: number;
  count: number;
};

export type ChartPoint = DailyWeightPoint & {
  ma7: number | null;
};

/** Same calendar day: average to one point per day */
export function buildDailySeries(entries: WeightEntry[]): DailyWeightPoint[] {
  const byDate = new Map<string, { sum: number; n: number }>();
  for (const e of entries) {
    const cur = byDate.get(e.date) ?? { sum: 0, n: 0 };
    cur.sum += e.weightKg;
    cur.n += 1;
    byDate.set(e.date, cur);
  }
  return [...byDate.entries()]
    .map(([date, { sum, n }]) => ({
      date,
      weightKg: Math.round((sum / n) * 10) / 10,
      count: n,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Trailing mean of up to 7 daily points in time order */
export function addMovingAverage7(daily: DailyWeightPoint[]): ChartPoint[] {
  return daily.map((row, i) => {
    const from = Math.max(0, i - 6);
    const slice = daily.slice(from, i + 1);
    const sum = slice.reduce((s, p) => s + p.weightKg, 0);
    const ma7 = Math.round((sum / slice.length) * 10) / 10;
    return { ...row, ma7 };
  });
}

function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Monday of the week containing isoDate, as YYYY-MM-DD */
export function weekMondayKey(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export type WeeklyBar = {
  weekStart: string;
  label: string;
  avgKg: number;
  daysWithData: number;
};

export function buildWeeklyBars(
  daily: DailyWeightPoint[],
  maxWeeks = 8,
): WeeklyBar[] {
  const byWeek = new Map<string, { sum: number; n: number }>();
  for (const p of daily) {
    const wk = weekMondayKey(p.date);
    const cur = byWeek.get(wk) ?? { sum: 0, n: 0 };
    cur.sum += p.weightKg;
    cur.n += 1;
    byWeek.set(wk, cur);
  }
  const rows = [...byWeek.entries()]
    .map(([weekStart, { sum, n }]) => ({
      weekStart,
      label: formatWeekLabel(weekStart),
      avgKg: Math.round((sum / n) * 10) / 10,
      daysWithData: n,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return rows.slice(-maxWeeks);
}

function formatWeekLabel(weekStartIso: string): string {
  const d = parseIsoDate(weekStartIso);
  return `${d.getMonth() + 1}/${d.getDate()}週`;
}

export type WeightSummary = {
  latestKg: number | null;
  latestDate: string | null;
  prevKg: number | null;
  prevDate: string | null;
  deltaFromPrev: number | null;
  avgLast7Days: number | null;
  avgPrev7Days: number | null;
  delta7dAvgs: number | null;
};

export function buildSummary(daily: DailyWeightPoint[]): WeightSummary {
  if (daily.length === 0) {
    return {
      latestKg: null,
      latestDate: null,
      prevKg: null,
      prevDate: null,
      deltaFromPrev: null,
      avgLast7Days: null,
      avgPrev7Days: null,
      delta7dAvgs: null,
    };
  }
  const last = daily[daily.length - 1];
  const prev = daily.length >= 2 ? daily[daily.length - 2] : null;
  const deltaFromPrev =
    prev != null
      ? Math.round((last.weightKg - prev.weightKg) * 10) / 10
      : null;

  const last7 = daily.slice(-7);
  const prev7 = daily.length > 7 ? daily.slice(-14, -7) : [];
  const avgLast7 =
    last7.length > 0
      ? Math.round(
          (last7.reduce((s, p) => s + p.weightKg, 0) / last7.length) * 10,
        ) / 10
      : null;
  const avgPrev =
    prev7.length > 0
      ? Math.round(
          (prev7.reduce((s, p) => s + p.weightKg, 0) / prev7.length) * 10,
        ) / 10
      : null;
  const delta7dAvgs =
    avgLast7 != null && avgPrev != null
      ? Math.round((avgLast7 - avgPrev) * 10) / 10
      : null;

  return {
    latestKg: last.weightKg,
    latestDate: last.date,
    prevKg: prev?.weightKg ?? null,
    prevDate: prev?.date ?? null,
    deltaFromPrev,
    avgLast7Days: avgLast7,
    avgPrev7Days: avgPrev,
    delta7dAvgs,
  };
}

export type CalendarDayCell = {
  date: string;
  dayNum: number;
  inMonth: boolean;
  weightKg: number | null;
};

/** Calendar grid, Monday-first; 6 rows */
export function buildCalendarMonth(
  year: number,
  monthIndex0: number,
  dailyMap: Map<string, number>,
): CalendarDayCell[] {
  const first = new Date(year, monthIndex0, 1, 12, 0, 0, 0);
  const startPad = (first.getDay() + 6) % 7;
  const startMs = first.getTime() - startPad * 86400000;
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(startMs + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${day}`;
    const inMonth = d.getMonth() === monthIndex0;
    const w = dailyMap.get(iso);
    cells.push({
      date: iso,
      dayNum: d.getDate(),
      inMonth,
      weightKg: w ?? null,
    });
  }
  return cells;
}

export function heatmapColor(
  kg: number | null,
  minKg: number,
  maxKg: number,
  dark: boolean,
): string {
  if (kg == null) {
    return dark ? "var(--hp-border)" : "#e2e8f0";
  }
  if (maxKg <= minKg) {
    return dark ? "#334155" : "#cbd5e1";
  }
  const t = (kg - minKg) / (maxKg - minKg);
  if (dark) {
    const r = Math.round(30 + t * 80);
    const g = Math.round(50 + t * 120);
    const b = Math.round(80 + t * 100);
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(220 - t * 100);
  const g = Math.round(235 - t * 40);
  const b = Math.round(250 - t * 80);
  return `rgb(${r},${g},${b})`;
}
