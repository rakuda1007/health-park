import { signInAnonymously } from "firebase/auth";
import { isFirebaseConfigured, getFirebaseAuth } from "./client";

/** 匿名ユーザーでサインイン（同一ブラウザでは UID が保持される） */
export async function ensureAnonymousUser(): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase が未設定です。");
  }
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
