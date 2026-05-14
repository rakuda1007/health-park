"use client";

import dynamic from "next/dynamic";
import { AnnouncementSnsShare } from "./announcement-sns-share";
import { AdsenseDisplayUnit } from "@/components/adsense-display-unit";
import { RecordingPageAd } from "@/components/recording-page-ad";
import {
  getAdsenseAnnouncementLeftSlotId,
  getAdsenseAnnouncementRightSlotId,
  getAdsenseAnnouncementTopSlotId,
} from "@/lib/adsense-config";
import { useLayoutEffect, useMemo, useState } from "react";

/** Tailwind `lg` と一致（左右柱が表示される幅） */
const LG_MIN_PX = 1024;

/** SSR の HTML に iframe（blogproxy 等）を出さない。SNS クローラーが子 URL として拾うのを防ぐ */
const AnnouncementArticleEmbed = dynamic(
  () =>
    import("./announcement-article-embed").then((m) => m.AnnouncementArticleEmbed),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[min(96vh,14000px)] w-full items-center justify-center rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] text-sm text-[color:var(--hp-muted)]"
        aria-busy="true"
        aria-live="polite"
      >
        記事を読み込んでいます…
      </div>
    ),
  },
);

type Props = {
  embedSrc: string;
  title: string;
  trustedOrigin: string;
  sharePageUrl: string | null;
};

/**
 * お知らせ詳細: 中央 max-w-4xl に embed、lg 以上で左右柱、iframe 上に任意の上枠、下は RecordingPageAd。
 * 左右柱が出る幅（lg 以上）では記事上の枠は出さない（柱と重ならないようにする）。
 */
export function AnnouncementArticleWithAds({
  embedSrc,
  title,
  trustedOrigin,
  sharePageUrl,
}: Props) {
  const topSlot = useMemo(() => getAdsenseAnnouncementTopSlotId(), []);
  const leftSlot = useMemo(() => getAdsenseAnnouncementLeftSlotId(), []);
  const rightSlot = useMemo(() => getAdsenseAnnouncementRightSlotId(), []);
  const hasSideRails = Boolean(leftSlot || rightSlot);
  const [isLgOrWider, setIsLgOrWider] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_MIN_PX}px)`);
    const sync = () => setIsLgOrWider(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
    };
  }, []);

  const showTopAd =
    Boolean(topSlot) && (!hasSideRails || !isLgOrWider);

  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center gap-6">
      {leftSlot ? (
        <AdsenseDisplayUnit
          slot={leftSlot}
          format="vertical"
          className="sticky top-24 hidden w-[160px] shrink-0 self-start lg:block"
          aria-label="広告（左）"
        />
      ) : null}
      <div className="min-w-0 w-full max-w-4xl shrink-0">
        {showTopAd && topSlot ? (
          <AdsenseDisplayUnit
            slot={topSlot}
            format="auto"
            className="mb-4 w-full min-w-0"
            aria-label="広告（記事上）"
          />
        ) : null}
        <AnnouncementArticleEmbed
          src={embedSrc}
          title={title}
          trustedOrigin={trustedOrigin}
        />
        <AnnouncementSnsShare shareUrl={sharePageUrl} title={title} />
        {/*
          iframe 内は別オリジンのため広告は埋め込めない。
          記録ページと同じロジックのユニットを本文下に表示する。
        */}
        <RecordingPageAd />
      </div>
      {rightSlot ? (
        <AdsenseDisplayUnit
          slot={rightSlot}
          format="vertical"
          className="sticky top-24 hidden w-[160px] shrink-0 self-start lg:block"
          aria-label="広告（右）"
        />
      ) : null}
    </div>
  );
}
