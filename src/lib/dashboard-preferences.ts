/**
 * ダッシュボードの表示項目・血圧グラフ軸（localStorage・この端末のみ）
 */
const LS_SHOW_CORE = "health-park-dashboard-show-core-bundle";
const LS_SHOW_BP = "health-park-dashboard-show-blood-pressure";
const LS_SHOW_APPOINTMENTS = "health-park-dashboard-show-appointments";
const LS_BP_AXIS_MIN = "health-park-dashboard-bp-axis-min";
const LS_BP_AXIS_MAX = "health-park-dashboard-bp-axis-max";
const LS_PULSE_AXIS_MIN = "health-park-dashboard-pulse-axis-min";
const LS_PULSE_AXIS_MAX = "health-park-dashboard-pulse-axis-max";
const LS_WEIGHT_AXIS_MIN = "health-park-dashboard-weight-axis-min";
const LS_WEIGHT_AXIS_MAX = "health-park-dashboard-weight-axis-max";

export const DASHBOARD_PREFS_CHANGED = "health-park-dashboard-prefs-changed";

/** 血圧グラフ左軸（mmHg）のデフォルト */
export const DEFAULT_BP_AXIS_MIN = 40;
export const DEFAULT_BP_AXIS_MAX = 170;
/** 脈拍グラフ右軸（回/分）のデフォルト */
export const DEFAULT_PULSE_AXIS_MIN = 40;
export const DEFAULT_PULSE_AXIS_MAX = 120;

const BP_AXIS_ABS_MIN = 0;
const BP_AXIS_ABS_MAX = 300;
const PULSE_AXIS_ABS_MIN = 20;
const PULSE_AXIS_ABS_MAX = 250;
const WEIGHT_AXIS_ABS_MIN = 0;
const WEIGHT_AXIS_ABS_MAX = 500;
const AXIS_MIN_SPAN = 10;
const WEIGHT_AXIS_MIN_SPAN = 1;

export type DashboardDisplayPreferences = {
  /** 体重・歩数グラフ＋振り返りヒートマップ（セット） */
  showCoreBundle: boolean;
  showBloodPressure: boolean;
  showAppointments: boolean;
  bpAxisMin: number;
  bpAxisMax: number;
  pulseAxisMin: number;
  pulseAxisMax: number;
  /** 未設定（null）のときは記録・目標帯から自動計算 */
  weightAxisMin: number | null;
  weightAxisMax: number | null;
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

function readOptionalInt(key: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(key);
  if (raw === null || raw.trim() === "") {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function readOptionalFloat(key: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(key);
  if (raw === null || raw.trim() === "") {
    return null;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 軸の最小・最大が有効か（最小＋10 ≤ 最大、絶対範囲内） */
export function validateAxisRange(
  min: number,
  max: number,
  absMin: number,
  absMax: number,
  minSpan = AXIS_MIN_SPAN,
): boolean {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }
  const a = clamp(min, absMin, absMax);
  const b = clamp(max, absMin, absMax);
  return b - a >= minSpan;
}

function readCustomWeightAxis(): { min: number; max: number } | null {
  const min = readOptionalFloat(LS_WEIGHT_AXIS_MIN);
  const max = readOptionalFloat(LS_WEIGHT_AXIS_MAX);
  if (min === null || max === null) {
    return null;
  }
  if (
    !validateAxisRange(
      min,
      max,
      WEIGHT_AXIS_ABS_MIN,
      WEIGHT_AXIS_ABS_MAX,
      WEIGHT_AXIS_MIN_SPAN,
    )
  ) {
    return null;
  }
  return { min, max };
}

function readAxisPair(
  minKey: string,
  maxKey: string,
  defaultMin: number,
  defaultMax: number,
  absMin: number,
  absMax: number,
): { min: number; max: number } {
  let min = readOptionalInt(minKey) ?? defaultMin;
  let max = readOptionalInt(maxKey) ?? defaultMax;
  min = clamp(min, absMin, absMax);
  max = clamp(max, absMin, absMax);
  if (max - min < AXIS_MIN_SPAN) {
    return { min: defaultMin, max: defaultMax };
  }
  return { min, max };
}

export function readDashboardDisplayPreferences(): DashboardDisplayPreferences {
  const bp = readAxisPair(
    LS_BP_AXIS_MIN,
    LS_BP_AXIS_MAX,
    DEFAULT_BP_AXIS_MIN,
    DEFAULT_BP_AXIS_MAX,
    BP_AXIS_ABS_MIN,
    BP_AXIS_ABS_MAX,
  );
  const pulse = readAxisPair(
    LS_PULSE_AXIS_MIN,
    LS_PULSE_AXIS_MAX,
    DEFAULT_PULSE_AXIS_MIN,
    DEFAULT_PULSE_AXIS_MAX,
    PULSE_AXIS_ABS_MIN,
    PULSE_AXIS_ABS_MAX,
  );
  const weight = readCustomWeightAxis();
  return {
    showCoreBundle: readBool(LS_SHOW_CORE, true),
    showBloodPressure: readBoolDefaultFalse(LS_SHOW_BP),
    showAppointments: readBool(LS_SHOW_APPOINTMENTS, true),
    bpAxisMin: bp.min,
    bpAxisMax: bp.max,
    pulseAxisMin: pulse.min,
    pulseAxisMax: pulse.max,
    weightAxisMin: weight?.min ?? null,
    weightAxisMax: weight?.max ?? null,
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

  const current = readDashboardDisplayPreferences();
  let bpMin = patch.bpAxisMin ?? current.bpAxisMin;
  let bpMax = patch.bpAxisMax ?? current.bpAxisMax;
  if (
    patch.bpAxisMin !== undefined ||
    patch.bpAxisMax !== undefined
  ) {
    if (
      validateAxisRange(bpMin, bpMax, BP_AXIS_ABS_MIN, BP_AXIS_ABS_MAX)
    ) {
      bpMin = clamp(bpMin, BP_AXIS_ABS_MIN, BP_AXIS_ABS_MAX);
      bpMax = clamp(bpMax, BP_AXIS_ABS_MIN, BP_AXIS_ABS_MAX);
      localStorage.setItem(LS_BP_AXIS_MIN, String(bpMin));
      localStorage.setItem(LS_BP_AXIS_MAX, String(bpMax));
    }
  }

  let pulseMin = patch.pulseAxisMin ?? current.pulseAxisMin;
  let pulseMax = patch.pulseAxisMax ?? current.pulseAxisMax;
  if (
    patch.pulseAxisMin !== undefined ||
    patch.pulseAxisMax !== undefined
  ) {
    if (
      validateAxisRange(
        pulseMin,
        pulseMax,
        PULSE_AXIS_ABS_MIN,
        PULSE_AXIS_ABS_MAX,
      )
    ) {
      pulseMin = clamp(pulseMin, PULSE_AXIS_ABS_MIN, PULSE_AXIS_ABS_MAX);
      pulseMax = clamp(pulseMax, PULSE_AXIS_ABS_MIN, PULSE_AXIS_ABS_MAX);
      localStorage.setItem(LS_PULSE_AXIS_MIN, String(pulseMin));
      localStorage.setItem(LS_PULSE_AXIS_MAX, String(pulseMax));
    }
  }

  if (patch.weightAxisMin === null && patch.weightAxisMax === null) {
    localStorage.removeItem(LS_WEIGHT_AXIS_MIN);
    localStorage.removeItem(LS_WEIGHT_AXIS_MAX);
  } else if (
    patch.weightAxisMin !== undefined ||
    patch.weightAxisMax !== undefined
  ) {
    const wMin = patch.weightAxisMin ?? current.weightAxisMin;
    const wMax = patch.weightAxisMax ?? current.weightAxisMax;
    if (
      wMin != null &&
      wMax != null &&
      validateAxisRange(
        wMin,
        wMax,
        WEIGHT_AXIS_ABS_MIN,
        WEIGHT_AXIS_ABS_MAX,
        WEIGHT_AXIS_MIN_SPAN,
      )
    ) {
      localStorage.setItem(LS_WEIGHT_AXIS_MIN, String(wMin));
      localStorage.setItem(LS_WEIGHT_AXIS_MAX, String(wMax));
    }
  }

  window.dispatchEvent(new Event(DASHBOARD_PREFS_CHANGED));
}

/** グラフの縦軸をデフォルトに戻す（体重は自動、血圧・脈拍は固定デフォルト） */
export function resetDashboardChartAxisPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(LS_WEIGHT_AXIS_MIN);
  localStorage.removeItem(LS_WEIGHT_AXIS_MAX);
  localStorage.setItem(LS_BP_AXIS_MIN, String(DEFAULT_BP_AXIS_MIN));
  localStorage.setItem(LS_BP_AXIS_MAX, String(DEFAULT_BP_AXIS_MAX));
  localStorage.setItem(LS_PULSE_AXIS_MIN, String(DEFAULT_PULSE_AXIS_MIN));
  localStorage.setItem(LS_PULSE_AXIS_MAX, String(DEFAULT_PULSE_AXIS_MAX));
  window.dispatchEvent(new Event(DASHBOARD_PREFS_CHANGED));
}
