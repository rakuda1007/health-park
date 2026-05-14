"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsensePublisherId,
  isAdsenseAdtestEnabled,
  isAdsenseDebugEnabled,
  shouldShowRecordingPageAds,
} from "@/lib/adsense-config";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    __hpAdsenseLoaded?: boolean;
  }
}

export type AdsenseDisplayUnitFormat = "auto" | "vertical";

type Props = {
  slot: string;
  format?: AdsenseDisplayUnitFormat;
  className?: string;
  "aria-label"?: string;
};

/**
 * 任意の data-ad-slot で AdSense ディスプレイ枠を 1 つ描画する。
 * 記録ページ用の RecordingPageAd（モバイルフォールバック等）とは別系統。
 */
export function AdsenseDisplayUnit({
  slot,
  format = "auto",
  className = "",
  "aria-label": ariaLabel = "広告",
}: Props) {
  const { user, ready } = useAuth();
  const client = useMemo(() => getAdsensePublisherId(), []);
  const adtest = useMemo(() => isAdsenseAdtestEnabled(), []);
  const debugEnabled = useMemo(() => isAdsenseDebugEnabled(), []);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "ok" | "error">("idle");
  const [adStatus, setAdStatus] = useState<"unknown" | "filled" | "unfilled">(
    "unknown",
  );
  const trimmed = slot.trim();
  const show =
    Boolean(client && trimmed) && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);
  const insRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.__hpAdsenseLoaded) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    pushedRef.current = false;
    setPushStatus("idle");
    setAdStatus("unknown");
  }, [trimmed, format]);

  useEffect(() => {
    if (!show || !client || !trimmed) {
      return;
    }

    let cancelled = false;

    const doPush = () => {
      if (cancelled || pushedRef.current) {
        return;
      }
      pushedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle ?? [];
        window.adsbygoogle.push({});
        setPushStatus("ok");
      } catch (e) {
        pushedRef.current = false;
        setPushStatus("error");
        console.error("[Health Park] AdSense の初期化に失敗しました", e);
      }
    };

    const onScriptLoaded = () => {
      window.__hpAdsenseLoaded = true;
      setScriptLoaded(true);
      doPush();
    };
    window.addEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
    const poll = window.setInterval(() => {
      if (window.__hpAdsenseLoaded) {
        onScriptLoaded();
      }
    }, 500);
    const t = window.setTimeout(() => {
      if (!pushedRef.current) {
        doPush();
      }
    }, 6000);

    return () => {
      cancelled = true;
      window.removeEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
      window.clearInterval(poll);
      window.clearTimeout(t);
    };
  }, [show, client, trimmed]);

  useEffect(() => {
    if (!show || !trimmed) {
      return;
    }
    const poll = window.setInterval(() => {
      const status = insRef.current?.getAttribute("data-ad-status");
      if (status === "filled") {
        setAdStatus("filled");
      } else if (status === "unfilled") {
        setAdStatus("unfilled");
      }
    }, 1000);
    return () => {
      window.clearInterval(poll);
    };
  }, [show, trimmed]);

  if (!show || !client || !trimmed) {
    return null;
  }

  const adRequestFailed = adStatus === "unfilled" || pushStatus === "error";
  const collapseAdArea = adRequestFailed;

  if (collapseAdArea && !debugEnabled) {
    return null;
  }

  const isVertical = format === "vertical";

  return (
    <aside
      className={className || "w-full max-w-full min-w-0"}
      aria-label={ariaLabel}
    >
      {!(collapseAdArea && debugEnabled) ? (
        <ins
          key={`${trimmed}-${format}`}
          ref={(el) => {
            insRef.current = el;
          }}
          className="adsbygoogle"
          style={
            isVertical
              ? { display: "block", width: "160px", minHeight: "600px" }
              : { display: "block" }
          }
          data-ad-client={client}
          data-ad-slot={trimmed}
          data-ad-format={isVertical ? "vertical" : "auto"}
          data-full-width-responsive={isVertical ? "false" : "true"}
          data-adtest={adtest ? "on" : undefined}
        />
      ) : null}
      {debugEnabled ? (
        <div className="mt-2 w-full max-w-[22rem] rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[11px] leading-5 text-[color:var(--hp-muted)]">
          <div>ads-debug: on (AdsenseDisplayUnit)</div>
          <div>format: {format}</div>
          <div>slot: {trimmed}</div>
          <div>adtest: {adtest ? "on" : "off"}</div>
          <div>scriptLoadedEvent: {scriptLoaded ? "yes" : "no"}</div>
          <div>pushStatus: {pushStatus}</div>
          <div>data-ad-status: {adStatus}</div>
          <div>authReady: {String(ready)}</div>
          <div>showAd: {String(show)}</div>
        </div>
      ) : null}
    </aside>
  );
}
