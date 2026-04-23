import {
  BACKUP_SCHEMA_VERSION,
  buildHealthParkBackup,
  replaceAllFromBackup,
  serializePrescription,
  validateHealthParkBackupData,
  type HealthParkBackupV1,
} from "@/lib/db/backup";
import type {
  BloodPressureEntry,
  ClinicAppointmentEntry,
  ClinicEntry,
  DailyReflectionEntry,
  MealEntry,
  PastMedicalHistoryEntry,
  PrescriptionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { ensureSignedInUser } from "@/lib/firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import {
  deleteObject,
  getBytes,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";

function scrub<T extends object>(o: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(o)) as Record<string, unknown>;
}

function prescriptionImagePath(uid: string, id: string): string {
  return `users/${uid}/prescription_images/${id}`;
}

/** IndexedDB の内容を Firestore + Storage に反映（ローカルが正） */
export async function pushLocalToCloud(): Promise<void> {
  const uid = await ensureSignedInUser();
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  const backup = await buildHealthParkBackup();

  const batchSet = async (
    col: string,
    docs: Array<{ id: string; data: Record<string, unknown> }>,
  ) => {
    for (let i = 0; i < docs.length; i += 400) {
      const part = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const { id, data } of part) {
        batch.set(doc(db, "users", uid, col, id), data);
      }
      await batch.commit();
    }
  };

  await batchSet(
    "weight",
    backup.weight.map((w) => ({ id: w.id, data: scrub(w) })),
  );
  await batchSet(
    "steps",
    backup.steps.map((s) => ({ id: s.id, data: scrub(s) })),
  );
  await batchSet(
    "bloodPressure",
    backup.bloodPressure.map((b) => ({ id: b.id, data: scrub(b) })),
  );
  await batchSet(
    "meals",
    backup.meals.map((m) => ({ id: m.id, data: scrub(m) })),
  );
  await batchSet(
    "clinics",
    backup.clinics.map((c) => ({ id: c.id, data: scrub(c) })),
  );
  await batchSet(
    "dailyReflections",
    (backup.dailyReflections ?? []).map((r) => ({
      id: r.id,
      data: scrub(r),
    })),
  );
  await batchSet(
    "pastMedicalHistory",
    (backup.pastMedicalHistory ?? []).map((r) => ({
      id: r.id,
      data: scrub(r),
    })),
  );
  await batchSet(
    "clinicAppointments",
    (backup.clinicAppointments ?? []).map((r) => ({
      id: r.id,
      data: scrub(r),
    })),
  );

  const rxDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
  for (const p of backup.prescriptions) {
    const id = p.id;
    let imageStoragePath: string | null = null;
    const imageMime: string | null = p.imageMime ?? null;

    if (p.imageBase64 && p.imageBase64.length > 0) {
      const path = prescriptionImagePath(uid, id);
      const binary = Uint8Array.from(atob(p.imageBase64), (c) => c.charCodeAt(0));
      const r = ref(storage, path);
      await uploadBytes(r, binary, {
        contentType: imageMime || "image/jpeg",
      });
      imageStoragePath = path;
    }

    const { imageBase64, ...rest } = p;
    void imageBase64;
    rxDocs.push({
      id,
      data: scrub({
        ...rest,
        imageStoragePath,
        imageMime,
      }),
    });
  }
  await batchSet("prescriptions", rxDocs);

  for (const p of backup.prescriptions) {
    if (!p.imageBase64 || p.imageBase64.length === 0) {
      try {
        await deleteObject(ref(storage, prescriptionImagePath(uid, p.id)));
      } catch {
        // 画像なし／未アップロード
      }
    }
  }

  await deleteOrphans(uid, "weight", new Set(backup.weight.map((w) => w.id)));
  await deleteOrphans(uid, "steps", new Set(backup.steps.map((s) => s.id)));
  await deleteOrphans(
    uid,
    "bloodPressure",
    new Set(backup.bloodPressure.map((b) => b.id)),
  );
  await deleteOrphans(uid, "meals", new Set(backup.meals.map((m) => m.id)));
  await deleteOrphans(uid, "clinics", new Set(backup.clinics.map((c) => c.id)));
  await deleteOrphans(
    uid,
    "dailyReflections",
    new Set((backup.dailyReflections ?? []).map((r) => r.id)),
  );
  await deleteOrphans(
    uid,
    "pastMedicalHistory",
    new Set((backup.pastMedicalHistory ?? []).map((r) => r.id)),
  );
  await deleteOrphans(
    uid,
    "clinicAppointments",
    new Set((backup.clinicAppointments ?? []).map((r) => r.id)),
  );
  await deleteOrphans(
    uid,
    "prescriptions",
    new Set(backup.prescriptions.map((p) => p.id)),
  );

  const localRxIds = new Set(backup.prescriptions.map((p) => p.id));
  const folderRef = ref(storage, `users/${uid}/prescription_images`);
  try {
    const listed = await listAll(folderRef);
    for (const item of listed.items) {
      const name = item.name.split("/").pop() ?? item.name;
      if (!localRxIds.has(name)) {
        await deleteObject(item);
      }
    }
  } catch {
    // empty
  }
}

async function deleteOrphans(
  uid: string,
  col: string,
  localIds: Set<string>,
): Promise<void> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, "users", uid, col));
  const toDelete = snap.docs.filter((d) => !localIds.has(d.id));
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of toDelete.slice(i, i + 400)) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

/** クラウドから取得し IndexedDB に復元（ローカルは上書き） */
export async function pullCloudToLocal(): Promise<void> {
  const uid = await ensureSignedInUser();
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();

  const weight: WeightEntry[] = [];
  const steps: StepsEntry[] = [];
  const bloodPressure: BloodPressureEntry[] = [];
  const meals: MealEntry[] = [];
  const clinics: ClinicEntry[] = [];
  const clinicAppointments: ClinicAppointmentEntry[] = [];
  const dailyReflections: DailyReflectionEntry[] = [];
  const pastMedicalHistory: PastMedicalHistoryEntry[] = [];
  const prescriptions: PrescriptionEntry[] = [];

  const wSnap = await getDocs(collection(db, "users", uid, "weight"));
  wSnap.forEach((d) => weight.push(d.data() as WeightEntry));
  const sSnap = await getDocs(collection(db, "users", uid, "steps"));
  sSnap.forEach((d) => steps.push(d.data() as StepsEntry));
  const bSnap = await getDocs(collection(db, "users", uid, "bloodPressure"));
  bSnap.forEach((d) => bloodPressure.push(d.data() as BloodPressureEntry));
  const mSnap = await getDocs(collection(db, "users", uid, "meals"));
  mSnap.forEach((d) => meals.push(d.data() as MealEntry));
  const cSnap = await getDocs(collection(db, "users", uid, "clinics"));
  cSnap.forEach((d) => clinics.push(d.data() as ClinicEntry));
  const caSnap = await getDocs(collection(db, "users", uid, "clinicAppointments"));
  caSnap.forEach((d) =>
    clinicAppointments.push({ ...(d.data() as ClinicAppointmentEntry), id: d.id }),
  );
  const drSnap = await getDocs(collection(db, "users", uid, "dailyReflections"));
  drSnap.forEach((d) =>
    dailyReflections.push({ ...(d.data() as DailyReflectionEntry), id: d.id }),
  );
  const pmhSnap = await getDocs(collection(db, "users", uid, "pastMedicalHistory"));
  pmhSnap.forEach((d) =>
    pastMedicalHistory.push({ ...(d.data() as PastMedicalHistoryEntry), id: d.id }),
  );

  const pSnap = await getDocs(collection(db, "users", uid, "prescriptions"));
  for (const d of pSnap.docs) {
    const data = d.data() as {
      createdAt: string;
      updatedAt: string;
      medicines: PrescriptionEntry["medicines"];
      memo?: string;
      imageStoragePath?: string | null;
      imageMime?: string | null;
    };
    const id = d.id;
    const entry: PrescriptionEntry = {
      id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      medicines: data.medicines ?? [],
      memo: data.memo,
    };
    if (data.imageStoragePath) {
      const r = ref(storage, data.imageStoragePath);
      entry.imageBlob = await getBytes(r);
      entry.imageMime = data.imageMime ?? "image/jpeg";
    }
    prescriptions.push(entry);
  }

  const raw: HealthParkBackupV1 = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "health-park",
    weight,
    steps,
    bloodPressure,
    meals,
    clinics,
    clinicAppointments,
    dailyReflections,
    pastMedicalHistory,
    prescriptions: prescriptions.map((p) => serializePrescription(p)),
  };

  validateHealthParkBackupData(raw);
  await replaceAllFromBackup(raw);
}
