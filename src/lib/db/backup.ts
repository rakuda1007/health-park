import {
  deleteBloodPressureEntry,
  deleteClinicEntry,
  deleteMealEntry,
  deletePrescriptionEntry,
  deleteStepsEntry,
  deleteWeightEntry,
  listBloodPressureEntries,
  listClinicEntries,
  listMealEntries,
  listPrescriptionEntries,
  listStepsEntries,
  listWeightEntries,
  putBloodPressureEntry,
  putClinicEntry,
  putMealEntry,
  putPrescriptionEntry,
  putStepsEntry,
  putWeightEntry,
} from "./index";
import type {
  BloodPressureEntry,
  ClinicEntry,
  MealEntry,
  PrescriptionEntry,
  PrescriptionMedicine,
  StepsEntry,
  WeightEntry,
} from "./types";

export const BACKUP_SCHEMA_VERSION = 1 as const;

export type PrescriptionBackup = Omit<PrescriptionEntry, "imageBlob"> & {
  imageBase64?: string;
};

export type HealthParkBackupV1 = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  app: "health-park";
  weight: WeightEntry[];
  steps: StepsEntry[];
  bloodPressure: BloodPressureEntry[];
  meals: MealEntry[];
  clinics: ClinicEntry[];
  prescriptions: PrescriptionBackup[];
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
  return (
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.createdAt === "string"
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
  ] = await Promise.all([
    listWeightEntries(),
    listStepsEntries(),
    listBloodPressureEntries(),
    listMealEntries(),
    listClinicEntries(),
    listPrescriptionEntries(),
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
  if (data.schemaVersion !== BACKUP_SCHEMA_VERSION) {
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
  return data as HealthParkBackupV1;
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

  return data;
}
