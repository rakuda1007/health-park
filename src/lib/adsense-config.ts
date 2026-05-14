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

/** お知らせ詳細・iframe 直上の横長枠。未設定なら枠なし */
export function getAdsenseAnnouncementTopSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANNOUNCEMENTS_TOP?.trim();
  return v || null;
}

/** お知らせ詳細・左柱（lg 以上のみ）。未設定なら非表示 */
export function getAdsenseAnnouncementLeftSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANNOUNCEMENTS_LEFT?.trim();
  return v || null;
}

/** お知らせ詳細・右柱（lg 以上のみ）。未設定なら非表示 */
export function getAdsenseAnnouncementRightSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANNOUNCEMENTS_RIGHT?.trim();
  return v || null;
}

/**
 * ルートで adsbygoogle.js を読み込むか。
 * メイン slot のほか、お知らせ専用 slot のいずれかがあれば有効。
 */
export function shouldLoadAdsenseScript(): boolean {
  const client = getAdsensePublisherId();
  if (!client) {
    return false;
  }
  return (
    Boolean(getAdsenseSlotId()) ||
    Boolean(getAdsenseAnnouncementTopSlotId()) ||
    Boolean(getAdsenseAnnouncementLeftSlotId()) ||
    Boolean(getAdsenseAnnouncementRightSlotId())
  );
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
  if (v === "320x100") {
    return { width: 320, height: 100 };
  }
  if (v != null && v !== "") {
    console.warn(
      `[Health Park] ADSENSE_UNIT_SIZE の値 "${v}" は未対応です。300x250 または 320x100 を指定してください。既定の 320x100 を使用します。`,
    );
  }
  return { width: 320, height: 100 };
}

/** data-ad-status が unfilled のときフォールバック枠へ切替するか */
export function isAdsenseFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_FALLBACK === "on";
}

/** フォールバックまでの待機 ms（既定 9000ms） */
export function getAdsenseFallbackDelayMs(): number {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_FALLBACK_DELAY_MS?.trim();
  if (!raw) {
    return 9000;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isNaN(n) && n >= 1000) {
    return n;
  }
  return 9000;
}

/** フォールバック先の slot（未設定なら通常 slot を再利用） */
export function getAdsenseFallbackSlotId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FALLBACK?.trim();
  return v || null;
}

/** フォールバック先の固定サイズ（既定 300x250） */
export function getAdsenseFallbackSize(): AdsenseFixedSize {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_FALLBACK_UNIT_SIZE;
  if (!raw) {
    return { width: 300, height: 250 };
  }
  return parseAdsenseUnitSize(raw);
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

/** 検証用。広告デバッグ情報を UI に表示するか */
export function isAdsenseDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_DEBUG === "on";
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
