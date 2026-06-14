"use client";

import type { DailyDashboardPoint } from "@/lib/dashboard-series";

type Props = {
  points: DailyDashboardPoint[];
};

export function ReflectionCommentList({ points }: Props) {
  const rows = [...points]
    .filter((p) => p.reflectionComment != null)
    .reverse();

  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 space-y-2">
      {rows.map((p) => (
        <li
          key={p.date}
          className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2.5"
        >
          <p className="text-xs tabular-nums text-[color:var(--hp-muted)]">
            {p.date}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--hp-foreground)]">
            {p.reflectionComment}
          </p>
        </li>
      ))}
    </ul>
  );
}
