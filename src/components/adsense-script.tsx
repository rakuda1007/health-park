"use client";

import Script from "next/script";

const LOAD_ATTR = "data-hp-adsense-loaded";

/** adsbygoogle.js 読み込み完了を RecordingPageAd が検知するためのフラグ */
export function markAdsenseScriptLoaded(): void {
  const el = document.querySelector<HTMLScriptElement>(
    `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`,
  );
  el?.setAttribute(LOAD_ATTR, "1");
  window.dispatchEvent(new CustomEvent("hp-adsense-loaded"));
}

/**
 * ルートで一度だけ読み込む AdSense スクリプト。
 * onLoad でイベント発火し、別コンポーネントから push タイミングを合わせられる。
 */
export function AdsenseScript({ clientId }: { clientId: string }) {
  return (
    <Script
      id="google-adsense"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        clientId,
      )}`}
      crossOrigin="anonymous"
      onLoad={() => {
        markAdsenseScriptLoaded();
      }}
    />
  );
}
