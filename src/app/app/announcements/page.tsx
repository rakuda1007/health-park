import { AnnouncementsPageClient } from "@/app/app/announcements/announcements-page-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "お知らせ",
};

function AnnouncementsListFallback() {
  return (
    <p className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-8 text-center text-sm text-[color:var(--hp-muted)]">
      読み込み中…
    </p>
  );
}

export default function AnnouncementsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
          お知らせ
        </h1>
        <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
          Health Park に関するお知らせ・コラムです。
        </p>
      </header>

      <Suspense fallback={<AnnouncementsListFallback />}>
        <AnnouncementsPageClient />
      </Suspense>
    </main>
  );
}
