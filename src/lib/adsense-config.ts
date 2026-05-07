import type { User } from "firebase/auth";

/** AdSense の data-ad-client（例: ca-pub-xxxxxxxx） */
export function getAdsensePublisherId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return v || null;
}

/** ディスプレイ広告ユニットの data-ad-slot */
export function getAdsenseSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim();
  return v || null;
}

/** 任意。モバイル向けに分ける data-ad-slot */
export function getAdsenseMobileSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE?.trim();
  return v || null;
}

export type AdsenseUnitIds = {
  client: string;
  slot: string;
};

export function getAdsenseUnitIds(): AdsenseUnitIds | null {
  const client = getAdsensePublisherId();
  const slot = getAdsenseSlotId();
  if (!client || !slot) {
    return null;
  }
  return { client, slot };
}

export type AdsenseFixedSize = { width: number; height: number };

function parseAdsenseUnitSize(raw?: string): AdsenseFixedSize {
  const v = raw?.trim().toLowerCase();
  if (v === "300x250") {
    return { width: 300, height: 250 };
  }
  return { width: 320, height: 100 };
}

/**
 * 既定 320×100。環境変数 NEXT_PUBLIC_ADSENSE_UNIT_SIZE で 300x250 に切替。
 * （後方互換のため残す）
 */
export function getAdsenseFixedSize(): AdsenseFixedSize {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_UNIT_SIZE;
  return parseAdsenseUnitSize(raw);
}

/**
 * ビューポート別の固定広告サイズ。
 * - モバイル: NEXT_PUBLIC_ADSENSE_UNIT_SIZE_MOBILE（未設定なら共通値）
 * - PC: NEXT_PUBLIC_ADSENSE_UNIT_SIZE_DESKTOP（未設定なら共通値）
 * - 共通値: NEXT_PUBLIC_ADSENSE_UNIT_SIZE
 *
 * 対応値は 320x100 / 300x250。
 */
export function getAdsenseFixedSizeForViewport(
  isMobileViewport: boolean,
): AdsenseFixedSize {
  const common = process.env.NEXT_PUBLIC_ADSENSE_UNIT_SIZE;
  const specific = isMobileViewport
    ? process.env.NEXT_PUBLIC_ADSENSE_UNIT_SIZE_MOBILE
    : process.env.NEXT_PUBLIC_ADSENSE_UNIT_SIZE_DESKTOP;
  return parseAdsenseUnitSize(specific ?? common);
}

/** 検証用。data-adtest=on を有効化するか（本番運用では未設定） */
export function isAdsenseAdtestEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_ADTEST === "on";
}

/**
 * 記録ページに広告を出すか。
 *
 * 既定（NEXT_PUBLIC_ADSENSE_HIDE_FOR_SIGNED_IN_USERS が true でない）では、
 * ログインの有無に関わらず unit が設定されていれば表示する。
 *
 * 運用で「登録（メール等）ログイン時は非表示」にするときは、
 * NEXT_PUBLIC_ADSENSE_HIDE_FOR_SIGNED_IN_USERS=true にする。
 */
export function shouldShowRecordingPageAds(
  user: User | null,
  authReady: boolean,
): boolean {
  const hideForSignedIn =
    process.env.NEXT_PUBLIC_ADSENSE_HIDE_FOR_SIGNED_IN_USERS === "true";
  if (!hideForSignedIn) {
    return true;
  }
  if (!authReady) {
    return false;
  }
  if (!user || user.isAnonymous) {
    return true;
  }
  return false;
}
