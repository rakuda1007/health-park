import Link from "next/link";

const cards = [
  {
    href: "/weight",
    title: "体重",
    body: "日付・体重を手入力",
  },
  {
    href: "/steps",
    title: "歩数",
    body: "手入力（健康アプリとの自動連携なし）",
  },
  {
    href: "/blood-pressure",
    title: "血圧",
    body: "収縮期・拡張期・脈拍（任意）",
  },
  {
    href: "/prescriptions",
    title: "処方箋",
    body: "薬名・用法・用量（手入力・編集）",
  },
  {
    href: "/meals",
    title: "食事",
    body: "朝・昼・晩・食べたものと一言（任意）",
  },
  {
    href: "/reflection",
    title: "振り返り",
    body: "食事・歩数・体調を〇△✕と一言で記録",
  },
  {
    href: "/clinics",
    title: "通院先",
    body: "病院・クリニック名のメモ",
  },
  {
    href: "/backup",
    title: "バックアップ",
    body: "JSON でエクスポート／インポート",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
        Health Park
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--hp-muted)]">
        日々の記録は、このブラウザ内（IndexedDB）に保存されます。メールでログインすると、保存のたびに Firebase と同期し、別の端末でも同じアカウントなら自動で揃います（オフライン時は次回オンラインで反映）。
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4 transition hover:border-[color:var(--hp-accent)]"
            >
              <span className="font-medium text-[color:var(--hp-foreground)]">
                {c.title}
              </span>
              <span className="mt-1 block text-sm text-[color:var(--hp-muted)]">
                {c.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
