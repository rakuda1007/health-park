import type { ClinicAppointmentEntry } from "@/lib/db/types";

/** 今日 0 時から指定日数先までの予定を日時順で最大件数まで（ダッシュボード用） */
export const DASHBOARD_APPOINTMENT_DAYS_AHEAD = 90;

export function selectDashboardClinicAppointments(
  rows: ClinicAppointmentEntry[],
  options?: { daysAhead?: number; maxItems?: number },
): ClinicAppointmentEntry[] {
  const daysAhead = options?.daysAhead ?? DASHBOARD_APPOINTMENT_DAYS_AHEAD;
  const maxItems = options?.maxItems ?? 24;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  end.setHours(23, 59, 59, 999);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return rows
    .filter((a) => {
      const t = new Date(a.startsAt).getTime();
      return t >= startMs && t <= endMs;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, maxItems);
}
