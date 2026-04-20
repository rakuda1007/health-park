import {
  deleteBloodPressureEntry,
  deleteClinicEntry,
  deleteDailyReflectionEntry,
  deleteMealEntry,
  deletePastMedicalHistoryEntry,
  deletePrescriptionEntry,
  deleteStepsEntry,
  deleteWeightEntry,
  listBloodPressureEntries,
  listClinicEntries,
  listDailyReflectionEntries,
  listMealEntries,
  listPastMedicalHistoryEntries,
  listPrescriptionEntries,
  listStepsEntries,
  listWeightEntries,
  putBloodPressureEntry,
  putClinicEntry,
  putDailyReflectionEntry,
  putMealEntry,
  putPastMedicalHistoryEntry,
  putPrescriptionEntry,
  putStepsEntry,
  putWeightEntry,
} from "./index";
import type {
  BloodPressureEntry,
  ClinicEntry,
  DailyReflectionEntry,
  MealEntry,
  PastMedicalHistoryEntry,
  PrescriptionEntry,
  PrescriptionMedicine,
  ReflectionRating,
  StepsEntry,
  WeightEntry,
} from "./types";

export const BACKUP_SCHEMA_VERSION = 2 as const;

export type PrescriptionBackup = Omit<PrescriptionEntry, "imageBlob"> & {
  imageBase64?: string;
};

export type HealthParkBackupV1 = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION | 1;
  exportedAt: string;
  app: "health-park";
  weight: WeightEntry[];
  steps: StepsEntry[];
  bloodPressure: BloodPressureEntry[];
  meals: MealEntry[];
  clinics: ClinicEntry[];
  prescriptions: PrescriptionBackup[];
  /** schemaVersion 2 以降（v1 ファイルには無い） */
  dailyReflections?: DailyReflectionEntry[];
  /** 既往歴（schemaVersion 2 の古いファイルや未対応エクスポートには無い場合あり） */
  pastMedicalHistory?: PastMedicalHistoryEntry[];
};

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function serializePrescription(p: PrescriptionEntry): PrescriptionBackup {
  const { imageBlob, ...rest } = p;
  return {
    ...rest,
    medicines: p.medicines ?? [],
    imageBase64:
      imageBlob && imageBlob.byteLength > 0
        ? arrayBufferToBase64(imageBlob)
        : undefined,
  };
}

export function deserializePrescription(p: PrescriptionBackup): PrescriptionEntry {
  const { imageBase64, ...rest } = p;
  const entry: PrescriptionEntry = {
    ...rest,
    medicines: Array.isArray(rest.medicines) ? rest.medicines : [],
  };
  if (imageBase64 && typeof imageBase64 === "string") {
    entry.imageBlob = base64ToArrayBuffer(imageBase64);
    if (!entry.imageMime) {
      entry.imageMime = "image/jpeg";
    }
  }
  return entry;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isWeightEntry(x: unknown): x is WeightEntry {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    typeof x.weightKg === "number" &&
    typeof x.createdAt === "string"
  );
}

function isStepsEntry(x: unknown): x is StepsEntry {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    typeof x.steps === "number" &&
    typeof x.createdAt === "string"
  );
}

function isReflectionRating(x: unknown): x is ReflectionRating {
  return x === "good" || x === "ok" || x === "bad";
}

function isDailyReflectionEntry(x: unknown): x is DailyReflectionEntry {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    isReflectionRating(x.mealRating) &&
    isReflectionRating(x.stepsRating) &&
    isReflectionRating(x.conditionRating) &&
    typeof x.createdAt === "string" &&
    typeof x.updatedAt === "string" &&
    (x.comment === undefined || typeof x.comment === "string")
  );
}

function isBloodPressureEntry(x: unknown): x is BloodPressureEntry {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    typeof x.systolic === "number" &&
    typeof x.diastolic === "number" &&
    typeof x.createdAt === "string"
  );
}

function isMealEntry(x: unknown): x is MealEntry {
  if (!isRecord(x)) {
    return false;
  }
  const slot = x.slot;
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    (slot === "breakfast" || slot === "lunch" || slot === "dinner") &&
    typeof x.foods === "string" &&
    typeof x.note === "string" &&
    typeof x.createdAt === "string"
  );
}

function isClinicEntry(x: unknown): x is ClinicEntry {
  if (!isRecord(x)) {
    return false;
  }
  const addressOk =
    x.address === undefined || typeof x.address === "string";
  const phoneOk = x.phone === undefined || typeof x.phone === "string";
  return (
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.createdAt === "string" &&
    addressOk &&
    phoneOk
  );
}

function isPastMedicalHistoryEntry(x: unknown): x is PastMedicalHistoryEntry {
  if (!isRecord(x)) {
    return false;
  }
  const dateOk =
    x.diagnosedOn === undefined || typeof x.diagnosedOn === "string";
  return (
    typeof x.id === "string" &&
    typeof x.title === "string" &&
    typeof x.createdAt === "string" &&
    dateOk &&
    (x.note === undefined || typeof x.note === "string")
  );
}

function isPrescriptionMedicine(x: unknown): x is PrescriptionMedicine {
  if (!isRecord(x)) {
    return false;
  }
  return typeof x.id === "string" && typeof x.name === "string";
}

function isPrescriptionBackup(x: unknown): x is PrescriptionBackup {
  if (!isRecord(x)) {
    return false;
  }
  const meds = x.medicines;
  if (!Array.isArray(meds) || !meds.every(isPrescriptionMedicine)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.createdAt === "string" &&
    typeof x.updatedAt === "string" &&
    (x.imageBase64 === undefined || typeof x.imageBase64 === "string")
  );
}

export async function buildHealthParkBackup(): Promise<HealthParkBackupV1> {
  const [
    weight,
    steps,
    bloodPressure,
    meals,
    clinics,
    prescriptionsRaw,
    dailyReflections,
    pastMedicalHistory,
  ] = await Promise.all([
    listWeightEntries(),
    listStepsEntries(),
    listBloodPressureEntries(),
    listMealEntries(),
    listClinicEntries(),
    listPrescriptionEntries(),
    listDailyReflectionEntries(),
    listPastMedicalHistoryEntries(),
  ]);
  const prescriptions = prescriptionsRaw.map(serializePrescription);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "health-park",
    weight,
    steps,
    bloodPressure,
    meals,
    clinics,
    prescriptions,
    dailyReflections,
    pastMedicalHistory,
  };
}

export async function exportHealthParkJsonPretty(): Promise<string> {
  const data = await buildHealthParkBackup();
  return JSON.stringify(data, null, 2);
}

export function validateHealthParkBackupData(data: unknown): HealthParkBackupV1 {
  if (!isRecord(data)) {
    throw new Error("バックアップ形式が正しくありません（オブジェクトではありません）。");
  }
  const sv = data.schemaVersion;
  if (sv !== 1 && sv !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `未対応のバージョンです（schemaVersion: ${String(data.schemaVersion)}）。`,
    );
  }
  if (data.app !== "health-park") {
    throw new Error("このファイルは Health Park のバックアップではありません。");
  }
  const w = data.weight;
  const s = data.steps;
  const b = data.bloodPressure;
  const m = data.meals;
  const c = data.clinics;
  const p = data.prescriptions;
  const dr = data.dailyReflections;
  const pmh = data.pastMedicalHistory;
  if (!Array.isArray(w) || !w.every(isWeightEntry)) {
    throw new Error("体重データの形式が不正です。");
  }
  if (!Array.isArray(s) || !s.every(isStepsEntry)) {
    throw new Error("歩数データの形式が不正です。");
  }
  if (!Array.isArray(b) || !b.every(isBloodPressureEntry)) {
    throw new Error("血圧データの形式が不正です。");
  }
  if (!Array.isArray(m) || !m.every(isMealEntry)) {
    throw new Error("食事データの形式が不正です。");
  }
  if (!Array.isArray(c) || !c.every(isClinicEntry)) {
    throw new Error("通院先データの形式が不正です。");
  }
  if (!Array.isArray(p) || !p.every(isPrescriptionBackup)) {
    throw new Error("処方箋データの形式が不正です。");
  }
  if (sv === BACKUP_SCHEMA_VERSION) {
    if (!Array.isArray(dr) || !dr.every(isDailyReflectionEntry)) {
      throw new Error("振り返りデータの形式が不正です。");
    }
  }
  if (
    pmh !== undefined &&
    (!Array.isArray(pmh) || !pmh.every(isPastMedicalHistoryEntry))
  ) {
    throw new Error("既往歴データの形式が不正です。");
  }
  const dailyReflections: DailyReflectionEntry[] =
    sv === BACKUP_SCHEMA_VERSION && Array.isArray(dr) && dr.every(isDailyReflectionEntry)
      ? dr
      : [];
  const pastMedicalHistory: PastMedicalHistoryEntry[] =
    Array.isArray(pmh) && pmh.every(isPastMedicalHistoryEntry) ? pmh : [];
  return {
    ...(data as HealthParkBackupV1),
    schemaVersion: sv === 1 ? 1 : BACKUP_SCHEMA_VERSION,
    dailyReflections,
    pastMedicalHistory,
  };
}

/** 既存データをすべて削除してからバックアップ内容で置き換える */
export async function replaceAllFromBackup(
  raw: unknown,
): Promise<HealthParkBackupV1> {
  const data = validateHealthParkBackupData(raw);
  const prescriptions = data.prescriptions.map(deserializePrescription);

  const ids = await Promise.all([
    listWeightEntries().then((rows) => rows.map((r) => r.id)),
    listStepsEntries().then((rows) => rows.map((r) => r.id)),
    listBloodPressureEntries().then((rows) => rows.map((r) => r.id)),
    listMealEntries().then((rows) => rows.map((r) => r.id)),
    listClinicEntries().then((rows) => rows.map((r) => r.id)),
    listPrescriptionEntries().then((rows) => rows.map((r) => r.id)),
    listDailyReflectionEntries().then((rows) => rows.map((r) => r.id)),
    listPastMedicalHistoryEntries().then((rows) => rows.map((r) => r.id)),
  ]);
  for (const id of ids[0]) {
    await deleteWeightEntry(id);
  }
  for (const id of ids[1]) {
    await deleteStepsEntry(id);
  }
  for (const id of ids[2]) {
    await deleteBloodPressureEntry(id);
  }
  for (const id of ids[3]) {
    await deleteMealEntry(id);
  }
  for (const id of ids[4]) {
    await deleteClinicEntry(id);
  }
  for (const id of ids[5]) {
    await deletePrescriptionEntry(id);
  }
  for (const id of ids[6]) {
    await deleteDailyReflectionEntry(id);
  }
  for (const id of ids[7]) {
    await deletePastMedicalHistoryEntry(id);
  }

  for (const row of data.weight) {
    await putWeightEntry(row);
  }
  for (const row of data.steps) {
    await putStepsEntry(row);
  }
  for (const row of data.bloodPressure) {
    await putBloodPressureEntry(row);
  }
  for (const row of data.meals) {
    await putMealEntry(row);
  }
  for (const row of data.clinics) {
    await putClinicEntry(row);
  }
  for (const row of prescriptions) {
    await putPrescriptionEntry(row);
  }
  for (const row of data.dailyReflections ?? []) {
    await putDailyReflectionEntry(row);
  }
  for (const row of data.pastMedicalHistory ?? []) {
    await putPastMedicalHistoryEntry(row);
  }

  return data;
}
