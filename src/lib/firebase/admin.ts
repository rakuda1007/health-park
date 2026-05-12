import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccountJson(): Record<string, unknown> {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    return JSON.parse(raw) as Record<string, unknown>;
  }
  throw new Error(
    "Firebase Admin 用の認証情報がありません。FIREBASE_SERVICE_ACCOUNT_JSON または FIREBASE_SERVICE_ACCOUNT_BASE64 を .env に設定してください。",
  );
}

let adminApp: App | undefined;

export function getFirebaseAdminApp(): App {
  if (!adminApp) {
    if (getApps().length > 0) {
      adminApp = getApps()[0]!;
      return adminApp;
    }
    const json = loadServiceAccountJson();
    adminApp = initializeApp({
      credential: cert(json as ServiceAccount),
    });
  }
  return adminApp;
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
