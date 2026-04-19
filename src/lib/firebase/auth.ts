import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./client";

/** クラウド同期用: メール／パスワードでログイン済みの UID を返す */
export async function ensureSignedInUser(): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase が未設定です。");
  }
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const u = auth.currentUser;
  if (!u) {
    throw new Error("クラウドバックアップを使うにはログインしてください。");
  }
  if (u.isAnonymous) {
    throw new Error(
      "クラウドバックアップにはメールアドレスでのログインが必要です。ログイン画面でサインインしてください。",
    );
  }
  return u.uid;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/** Firebase Auth のエラーコードを短い日本語に */
export function formatAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/weak-password": "パスワードは6文字以上にしてください。",
    "auth/user-not-found": "アカウントが見つかりません。",
    "auth/wrong-password": "パスワードが正しくありません。",
    "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
    "auth/too-many-requests": "試行回数が多すぎます。しばらく待ってから再度お試しください。",
    "auth/network-request-failed": "ネットワークエラーです。接続を確認してください。",
  };
  return map[code] ?? "認証に失敗しました。入力内容を確認してください。";
}
