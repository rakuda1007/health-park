import { normalizeDailyReflectionEntry } from "@/lib/reflection-display";
import {
  deleteBloodPressureEntry,
  deleteClinicAppointmentEntry,
  deleteClinicEntry,
  deleteDailyReflectionEntry,
  deleteMealEntry,
  deleteMealItemMaster,
  deleteMealSetMaster,
  deletePastMedicalHistoryEntry,
  deletePrescriptionEntry,
  deleteStepsEntry,
  deleteWeightEntry,
  listBloodPressureEntries,
  listClinicAppointments,
  listClinicEntries,
  listDailyReflectionEntries,
  listMealEntries,
  listMealItemMasters,
  listMealSetMasters,
  listPastMedicalHistoryEntries,
  listPrescriptionEntries,
  listStepsEntries,
  listWeightEntries,
  putBloodPressureEntry,
  putClinicAppointmentEntry,
  putClinicEntry,
  putDailyReflectionEntry,
  putMealEntry,
  putMealItemMaster,
  putMealSetMaster,
  putPastMedicalHistoryEntry,
  putPrescriptionEntry,
  putStepsEntry,
  putWeightEntry,
} from "./index";
import type {
  BloodPressureEntry,
  ClinicAppointmentEntry,
  ClinicEntry,
  DailyReflectionEntry,
  MealEntry,
  MealItemMaster,
  MealSetMaster,
  MealMasterSlot,
  PastMedicalHistoryEntry,
  PrescriptionEntry,
  PrescriptionMedicine,
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
  /** 通院予定（古いバックアップには無い場合あり） */
  clinicAppointments?: ClinicAppointmentEntry[];
  /** 食事一品マスタ（古いバックアップには無い場合あり） */
  mealItemMasters?: MealItemMaster[];
  /** 食事セットマスタ（古いバックアップには無い場合あり） */
  mealSetMasters?: MealSetMaster[];
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

function normalizeDailyReflectionFromBackup(
  x: unknown,
): DailyReflectionEntry | null {
  return normalizeDailyReflectionEntry(x);
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

function isMealMasterSlot(x: unknown): x is MealMasterSlot {
  return (
    x === "any" ||
    x === "breakfast" ||
    x === "lunch" ||
    x === "dinner"
  );
}

function isMealItemMaster(x: unknown): x is MealItemMaster {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.label === "string" &&
    isMealMasterSlot(x.slot) &&
    typeof x.sortOrder === "number" &&
    typeof x.createdAt === "string" &&
    (x.lastUsedAt === undefined || typeof x.lastUsedAt === "string") &&
    (x.updatedAt === undefined || typeof x.updatedAt === "string")
  );
}

function isMealSetMaster(x: unknown): x is MealSetMaster {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.id === "string" &&
    typeof x.label === "string" &&
    typeof x.foods === "string" &&
    isMealMasterSlot(x.slot) &&
    typeof x.sortOrder === "number" &&
    typeof x.createdAt === "string" &&
    (x.lastUsedAt === undefined || typeof x.lastUsedAt === "string") &&
    (x.updatedAt === undefined || typeof x.updatedAt === "string")
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

function isClinicAppointmentEntry(x: unknown): x is ClinicAppointmentEntry {
  if (!isRecord(x)) {
    return false;
  }
  const endsOk = x.endsAt === undefined || typeof x.endsAt === "string";
  const titleOk = x.title === undefined || typeof x.title === "string";
  const noteOk = x.note === undefined || typeof x.note === "string";
  const updatedOk =
    x.updatedAt === undefined || typeof x.updatedAt === "string";
  return (
    typeof x.id === "string" &&
    typeof x.clinicId === "string" &&
    typeof x.startsAt === "string" &&
    typeof x.createdAt === "string" &&
    endsOk &&
    titleOk &&
    noteOk &&
    updatedOk
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
    clinicAppointments,
    mealItemMasters,
    mealSetMasters,
  ] = await Promise.all([
    listWeightEntries(),
    listStepsEntries(),
    listBloodPressureEntries(),
    listMealEntries(),
    listClinicEntries(),
    listPrescriptionEntries(),
    listDailyReflectionEntries(),
    listPastMedicalHistoryEntries(),
    listClinicAppointments(),
    listMealItemMasters(),
    listMealSetMasters(),
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
    clinicAppointments,
    mealItemMasters,
    mealSetMasters,
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
  const ca = data.clinicAppointments;
  const mim = data.mealItemMasters;
  const msm = data.mealSetMasters;
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
    if (dr !== undefined && !Array.isArray(dr)) {
      throw new Error("振り返りデータの形式が不正です。");
    }
  }
  if (
    pmh !== undefined &&
    (!Array.isArray(pmh) || !pmh.every(isPastMedicalHistoryEntry))
  ) {
    throw new Error("既往歴データの形式が不正です。");
  }
  if (
    ca !== undefined &&
    (!Array.isArray(ca) || !ca.every(isClinicAppointmentEntry))
  ) {
    throw new Error("通院予定データの形式が不正です。");
  }
  if (
    mim !== undefined &&
    (!Array.isArray(mim) || !mim.every(isMealItemMaster))
  ) {
    throw new Error("食事一品マスタの形式が不正です。");
  }
  if (
    msm !== undefined &&
    (!Array.isArray(msm) || !msm.every(isMealSetMaster))
  ) {
    throw new Error("食事セットマスタの形式が不正です。");
  }
  const dailyReflections: DailyReflectionEntry[] =
    sv === BACKUP_SCHEMA_VERSION && Array.isArray(dr)
      ? dr
          .map(normalizeDailyReflectionFromBackup)
          .filter((r): r is DailyReflectionEntry => r != null)
      : [];
  const pastMedicalHistory: PastMedicalHistoryEntry[] =
    Array.isArray(pmh) && pmh.every(isPastMedicalHistoryEntry) ? pmh : [];
  const clinicAppointments: ClinicAppointmentEntry[] =
    Array.isArray(ca) && ca.every(isClinicAppointmentEntry) ? ca : [];
  const mealItemMastersOut: MealItemMaster[] =
    Array.isArray(mim) && mim.every(isMealItemMaster) ? mim : [];
  const mealSetMastersOut: MealSetMaster[] =
    Array.isArray(msm) && msm.every(isMealSetMaster) ? msm : [];
  return {
    ...(data as HealthParkBackupV1),
    schemaVersion: sv === 1 ? 1 : BACKUP_SCHEMA_VERSION,
    dailyReflections,
    pastMedicalHistory,
    clinicAppointments,
    mealItemMasters: mealItemMastersOut,
    mealSetMasters: mealSetMastersOut,
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
    listClinicAppointments().then((rows) => rows.map((r) => r.id)),
    listMealItemMasters().then((rows) => rows.map((r) => r.id)),
    listMealSetMasters().then((rows) => rows.map((r) => r.id)),
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
  for (const id of ids[8]) {
    await deleteClinicAppointmentEntry(id);
  }
  for (const id of ids[9]) {
    await deleteMealItemMaster(id);
  }
  for (const id of ids[10]) {
    await deleteMealSetMaster(id);
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
  for (const row of data.clinicAppointments ?? []) {
    await putClinicAppointmentEntry(row);
  }
  for (const row of data.mealItemMasters ?? []) {
    await putMealItemMaster(row);
  }
  for (const row of data.mealSetMasters ?? []) {
    await putMealSetMaster(row);
  }

  return data;
}
