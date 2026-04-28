import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[color:var(--hp-border)] bg-[color:var(--hp-surface)] px-4 py-4 text-center text-xs leading-relaxed text-[color:var(--hp-muted)]">
      <p>
        本アプリは医療機器・診断ツールではありません。記録は主にブラウザ内（IndexedDB）に保存されます。バックアップ画面で
        Firebase を設定しログインした場合のみ、あなたのプロジェクトへメール／パスワード認証でバックアップできます。
      </p>
      <p className="mt-2">
        <Link
          href="/portal"
          className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
        >
          初めての方・ご利用案内（ポータル）
        </Link>
        <span className="mx-2 opacity-60">/</span>
        <Link
          href="https://series.tennis-park-community.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
        >
          Parkシリーズ ポータル
        </Link>
      </p>
    </footer>
  );
}
