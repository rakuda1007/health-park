/**
 * ダッシュボードの表示項目（localStorage・この端末のみ）
 */
const LS_SHOW_CORE = "health-park-dashboard-show-core-bundle";
const LS_SHOW_BP = "health-park-dashboard-show-blood-pressure";
const LS_SHOW_APPOINTMENTS = "health-park-dashboard-show-appointments";

export const DASHBOARD_PREFS_CHANGED = "health-park-dashboard-prefs-changed";

export type DashboardDisplayPreferences = {
  /** 体重・歩数グラフ＋振り返りヒートマップ（セット） */
  showCoreBundle: boolean;
  showBloodPressure: boolean;
  showAppointments: boolean;
};

function readBool(key: string, defaultTrue: boolean): boolean {
  if (typeof window === "undefined") {
    return defaultTrue;
  }
  const v = localStorage.getItem(key);
  if (v === null) {
    return defaultTrue;
  }
  return v === "1";
}

function readBoolDefaultFalse(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(key) === "1";
}

export function readDashboardDisplayPreferences(): DashboardDisplayPreferences {
  return {
    showCoreBundle: readBool(LS_SHOW_CORE, true),
    showBloodPressure: readBoolDefaultFalse(LS_SHOW_BP),
    showAppointments: readBool(LS_SHOW_APPOINTMENTS, true),
  };
}

export function writeDashboardDisplayPreferences(
  patch: Partial<DashboardDisplayPreferences>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (patch.showCoreBundle !== undefined) {
    localStorage.setItem(LS_SHOW_CORE, patch.showCoreBundle ? "1" : "0");
  }
  if (patch.showBloodPressure !== undefined) {
    localStorage.setItem(LS_SHOW_BP, patch.showBloodPressure ? "1" : "0");
  }
  if (patch.showAppointments !== undefined) {
    localStorage.setItem(
      LS_SHOW_APPOINTMENTS,
      patch.showAppointments ? "1" : "0",
    );
  }
  window.dispatchEvent(new Event(DASHBOARD_PREFS_CHANGED));
}
