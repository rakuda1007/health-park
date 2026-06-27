/** IndexedDB ストア名 → テレメトリ用の記録種別（健康データ本体は送らない） */
export const TELEMETRY_RECORD_TYPES = [
  "weight",
  "steps",
  "bloodPressure",
  "meals",
  "mealItemMasters",
  "mealSetMasters",
  "clinics",
  "clinicAppointments",
  "dailyReflections",
  "pastMedicalHistory",
  "prescriptions",
] as const;

export type TelemetryRecordType = (typeof TELEMETRY_RECORD_TYPES)[number];

const STORE_TO_TELEMETRY = new Map<string, TelemetryRecordType>(
  TELEMETRY_RECORD_TYPES.map((t) => [t, t]),
);

export function storeNameToTelemetryType(
  storeName: string,
): TelemetryRecordType | null {
  return STORE_TO_TELEMETRY.get(storeName) ?? null;
}

export function isTelemetryRecordType(v: unknown): v is TelemetryRecordType {
  return (
    typeof v === "string" &&
    (TELEMETRY_RECORD_TYPES as readonly string[]).includes(v)
  );
}

/** 端末ごとの匿名 ID（localStorage） */
export const TELEMETRY_ANONYMOUS_ID_LS_KEY = "hp-telemetry-id";

/** Firestore: `telemetryDevices/{anonymousId}` */
export const TELEMETRY_DEVICES_COLLECTION = "telemetryDevices";

/** UUID v4（小文字） */
export const TELEMETRY_ANONYMOUS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
