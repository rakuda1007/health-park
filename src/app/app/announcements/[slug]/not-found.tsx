import { appPath } from "@/lib/app-paths";
import Link from "next/link";

export default function AnnouncementNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-center">
      <h1 className="text-lg font-semibold text-[color:var(--hp-foreground)]">
        記事が見つかりません
      </h1>
      <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
        スラッグが違うか、公開が終了している可能性があります。
      </p>
      <p className="mt-6">
        <Link
          href={appPath("/announcements")}
          className="font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
        >
          お知らせ一覧へ
        </Link>
      </p>
    </main>
  );
}
