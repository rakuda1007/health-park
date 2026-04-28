import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPageClient } from "./login-page-client";

export const metadata: Metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-8">
          <p className="text-sm text-[color:var(--hp-muted)]">読み込み中…</p>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
