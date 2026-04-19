export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[color:var(--hp-border)] bg-[color:var(--hp-surface)] px-4 py-4 text-center text-xs leading-relaxed text-[color:var(--hp-muted)]">
      {
        "本アプリは医療機器・診断ツールではありません。記録は主にブラウザ内（IndexedDB）に保存されます。バックアップ画面で Firebase を設定しログインした場合のみ、あなたのプロジェクトへメール／パスワード認証でバックアップできます。"
      }
    </footer>
  );
}
