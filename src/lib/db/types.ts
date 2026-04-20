/** ISO 日付（YYYY-MM-DD） */
export type IsoDate = string;

export type WeightEntry = {
  id: string;
  date: IsoDate;
  /** kg */
  weightKg: number;
  note?: string;
  createdAt: string;
  /** 同期・マージ用（保存のたびに更新） */
  updatedAt?: string;
};

export type StepsEntry = {
  id: string;
  date: IsoDate;
  steps: number;
  createdAt: string;
  updatedAt?: string;
};

export type BloodPressureEntry = {
  id: string;
  date: IsoDate;
  systolic: number;
  diastolic: number;
  pulse?: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type MealEntry = {
  id: string;
  date: IsoDate;
  slot: MealSlot;
  foods: string;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export type ClinicEntry = {
  id: string;
  name: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type PrescriptionMedicine = {
  id: string;
  name: string;
  dosage?: string;
  note?: string;
};

export type PrescriptionEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** 旧バージョンのバックアップ互換用（現行 UI では未使用） */
  imageBlob?: ArrayBuffer;
  imageMime?: string;
  /** 薬の一覧 */
  medicines: PrescriptionMedicine[];
  memo?: string;
};
