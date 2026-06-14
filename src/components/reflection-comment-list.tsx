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
    <div className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--hp-border)]">
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
            <th className="w-[7.5rem] px-3 py-2 text-xs font-medium text-[color:var(--hp-muted)]">
              日付
            </th>
            <th className="min-w-[12rem] px-3 py-2 text-xs font-medium text-[color:var(--hp-muted)]">
              コメント
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.date}
              className="border-b border-[color:var(--hp-border)] last:border-b-0"
            >
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[color:var(--hp-foreground)]">
                {p.date}
              </td>
              <td className="whitespace-pre-wrap px-3 py-2.5 text-[color:var(--hp-foreground)]">
                {p.reflectionComment}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
