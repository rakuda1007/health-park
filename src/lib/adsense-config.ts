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

/** 固定サイズ（320×100 等）か、レスポンシブ（data-ad-format=auto）か */
export type AdsenseLayoutMode = "fixed" | "responsive";

/**
 * 広告枠のレイアウト。
 * - fixed（既定）: 固定 width/height・data-full-width-responsive="false"
 * - responsive: Google 推奨の表示広告スニペットに近い指定（モバイル配信の切り分け用）
 */
export function getAdsenseLayoutMode(): AdsenseLayoutMode {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_LAYOUT?.trim().toLowerCase();
  if (raw === "responsive") {
    return "responsive";
  }
  return "fixed";
}

/**
 * モバイル幅でのレイアウト上書き。
 * - 未設定のときは全体（NEXT_PUBLIC_ADSENSE_LAYOUT）と同じ（レスポンシブ作成ユニットと整合しやすい）。
 * - fixed にしたい検証時だけ NEXT_PUBLIC_ADSENSE_MOBILE_LAYOUT=fixed。
 */
export function getAdsenseMobileLayoutOverride(): AdsenseLayoutMode | null {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_MOBILE_LAYOUT?.trim().toLowerCase();
  if (raw === "responsive") {
    return "responsive";
  }
  if (raw === "fixed") {
    return "fixed";
  }
  return null;
}

/** 記録ページ広告の実効レイアウト（ビューポート別） */
export function resolveRecordingPageAdLayout(
  isMobileViewport: boolean,
  globalLayout: AdsenseLayoutMode,
): AdsenseLayoutMode {
  if (!isMobileViewport) {
    return globalLayout;
  }
  const mobileOverride = getAdsenseMobileLayoutOverride();
  if (mobileOverride != null) {
    return mobileOverride;
  }
  return globalLayout;
}

/** responsive 時の ins の min-height（px）。未設定または不正時は 100 */
export function getAdsenseResponsiveMinHeightPx(): number {
  const v = process.env.NEXT_PUBLIC_ADSENSE_RESPONSIVE_MIN_HEIGHT?.trim();
  if (v) {
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n) && n > 0) {
      return n;
    }
  }
  return 100;
}

/** AdSense のテスト広告（data-adtest=on）を有効化するか */
export function isAdsenseAdtestEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_ADTEST === "on";
}

/** 既定 320×100。環境変数 NEXT_PUBLIC_ADSENSE_UNIT_SIZE で 300x250 に切替 */
export function getAdsenseFixedSize(): AdsenseFixedSize {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_UNIT_SIZE?.trim().toLowerCase();
  if (raw === "300x250") {
    return { width: 300, height: 250 };
  }
  return { width: 320, height: 100 };
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
