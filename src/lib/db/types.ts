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
  /** 住所（任意） */
  address?: string;
  /** 電話番号（任意） */
  phone?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

/** 既往歴（手入力メモ。医療記録としての証明力はありません） */
export type PastMedicalHistoryEntry = {
  id: string;
  /** 病名・疾患の要約 */
  title: string;
  /** 診断日や発症の目安（任意） */
  diagnosedOn?: IsoDate;
  /** 詳細メモ（任意） */
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

/** 振り返りの自己評価（表示は 〇・△・✕） */
export type ReflectionRating = "good" | "ok" | "bad";

/** 1日1件：食事全体・歩数・体調の振り返り */
export type DailyReflectionEntry = {
  id: string;
  date: IsoDate;
  mealRating: ReflectionRating;
  stepsRating: ReflectionRating;
  conditionRating: ReflectionRating;
  comment?: string;
  createdAt: string;
  updatedAt: string;
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
