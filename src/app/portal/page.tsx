import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { appPath } from "@/lib/app-paths";

export const metadata: Metadata = {
  title: "ヘルスパーク | ポータル",
  description:
    "ヘルスパークのポータルページ。日々の記録をAIの力で健康習慣に変える、やさしい健康管理アプリです。",
};

export default function PortalPage() {
  return (
    <main
      className="mx-auto max-w-6xl space-y-20 px-4 py-10 text-[color:var(--hp-foreground)] sm:px-6 lg:px-8"
      style={{ fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif' }}
    >
      <section className="relative overflow-hidden rounded-3xl shadow-xl">
        <Image
          src="/top_s.jpg"
          alt="青空の下でランニングを楽しむ親子"
          width={1400}
          height={760}
          className="h-[520px] w-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/20" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-2xl px-6 py-8 text-white sm:px-10">
            <p className="text-sm font-medium tracking-[0.08em] text-white/85">
              HEALTH PARK PORTAL
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
              明日の自分が、
              <br />
              もっと楽しみになる。
            </h1>
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-white/90 sm:text-base">
              体重、歩数、血圧、そして食事。
              {"\n"}
              日々の小さな記録が、AIの力で「確かな健康」に変わる。
              {"\n"}
              ヘルスパークは、あなたの毎日をポジティブに整える健康管理アプリです。
            </p>
            <div className="mt-7">
              <Link
                href={appPath("/dashboard")}
                className="inline-flex items-center justify-center rounded-full bg-[#FF9800] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-95"
              >
                無料で今すぐはじめる
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-[color:var(--hp-card)] px-6 py-12 shadow-sm sm:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#76BA1B]/15 text-3xl">
            🌱
          </div>
          <h2 className="mt-5 text-2xl font-semibold sm:text-3xl">
            「記録する」から「自分を知る」へ。
          </h2>
          <p className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm leading-8 text-[color:var(--hp-muted)] sm:text-base">
            健康管理、ついつい後回しにしていませんか？
            {"\n"}
            ヘルスパークは、単に数値を記録するだけの場所ではありません。
            {"\n"}
            記録したデータから、あなたの体が発している「サイン」を読み解き、
            {"\n"}
            昨日よりも健やかな今日を過ごすための「気づき」をお届けします。
          </p>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">3つの主要機能</h2>
        <div className="space-y-6">
          <article className="grid items-center gap-6 rounded-3xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5 shadow-sm md:grid-cols-2 md:gap-8 md:p-7">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <Image
                src="/dashboard.jpg"
                alt="体重と歩数の推移が表示されたスマートダッシュボード画面"
                width={1200}
                height={900}
                className="h-full w-full object-contain p-1.5"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                ① 変化が一目でわかる「スマート・ダッシュボード」
              </h3>
              <p className="mt-3 text-sm leading-8 text-[color:var(--hp-muted)] sm:text-base">
                毎日の記録を、見るだけで変化が伝わるダッシュボードに自動整理。数字の羅列ではなく、続けるほど前向きになれる画面体験を目指しました。
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--hp-muted)] sm:text-base">
                <li>・入力したデータは、即座に見やすいグラフで表示されます。</li>
                <li>・「先週より歩数が増えた」「血圧が安定してきた」を直感的に把握できます。</li>
                <li>・努力の積み重ねが可視化されることで、毎日の記録が楽しみに変わります。</li>
              </ul>
            </div>
          </article>

          <article className="grid items-center gap-6 rounded-3xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5 shadow-sm md:grid-cols-2 md:gap-8 md:p-7">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-black/10 shadow-sm md:order-2">
              <Image
                src="/meal.jpg"
                alt="食事写真と栄養バランスを振り返る食事ログ画面のイメージ"
                width={1200}
                height={900}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
            <div className="md:order-1">
              <h3 className="text-xl font-semibold">② 食生活をデザインする「食事ログ」</h3>
              <p className="mt-3 text-sm leading-8 text-[color:var(--hp-muted)] sm:text-base">
                食事は健康習慣の土台。写真と記録を一緒に残すことで、その日の生活背景まで自然に思い出せるログ体験をつくります。
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--hp-muted)] sm:text-base">
                <li>・食べたものを記録するだけで、栄養バランスの偏りに気づけます。</li>
                <li>・写真を添えることで、思い出と一緒に食習慣を振り返れます。</li>
                <li>・無理な制限ではなく、今の自分に合う「心地よい食事」を見つけるガイドになります。</li>
              </ul>
            </div>
          </article>

          <article className="grid items-center gap-6 rounded-3xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5 shadow-sm md:grid-cols-2 md:gap-8 md:p-7">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <Image
                src="/summary.PNG"
                alt="AIからの週次サマリーとアドバイスが表示された画面"
                width={1200}
                height={900}
                className="h-full w-full object-contain p-1.5"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                ③ 24時間あなたに寄り添う「AIアドバイス」
              </h3>
              <p className="mt-3 text-sm leading-8 text-[color:var(--hp-muted)] sm:text-base">
                続ける力を生むのは、タイミングのよい声かけ。AIが記録の流れを読み取り、今のあなたに合った行動ヒントを届けます。
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--hp-muted)] sm:text-base">
                <li>・一人で頑張り続けなくても、AIがそっと伴走してくれます。</li>
                <li>・あなたのデータに基づく、パーソナライズされたメッセージを表示します。</li>
                <li>・やさしい励ましがモチベーションを支え、習慣化を後押しします。</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-r from-emerald-50 via-lime-50 to-orange-50 px-6 py-12 sm:px-10">
        <div className="grid items-center gap-8 md:grid-cols-[96px_1fr]">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-5xl">🤝</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              心強い、あなたの専属パートナー。
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-[color:var(--hp-muted)] sm:text-base">
              ヘルスパークのAIは、あなたの「できたこと」を絶対に見逃しません。
              {"\n"}
              忙しくて記録が途切れても、いつでも温かくあなたを迎えます。
              {"\n"}
              時には厳しく、時には優しく。
              {"\n"}
              あなたの健康維持を一生懸命に応援する、一番身近な味方です。
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">ご利用の流れ</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="relative rounded-2xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-6">
            <span className="text-5xl font-bold leading-none text-[#76BA1B]/30">1</span>
            <h3 className="mt-3 text-lg font-semibold">アプリをひらく</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--hp-muted)]">
              登録なしですぐに使い始められます。テニスパークのアカウントでログインすると、クラウド同期など便利な機能も使えます。
            </p>
          </article>
          <article className="relative rounded-2xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-6">
            <span className="text-5xl font-bold leading-none text-[#76BA1B]/30">2</span>
            <h3 className="mt-3 text-lg font-semibold">日々の体調を入力</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--hp-muted)]">
              体重・歩数・血圧・食事など、必要な項目だけでOK。気軽な記録を積み重ねるほど、あなた専用の健康データが育っていきます。
            </p>
          </article>
          <article className="relative rounded-2xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-6">
            <span className="text-5xl font-bold leading-none text-[#76BA1B]/30">3</span>
            <h3 className="mt-3 text-lg font-semibold">アドバイスを受け取る</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--hp-muted)]">
              AIがあなたのデータを分析し、毎日に活かせる気づきをお届け。小さな前進を実感しながら、健康習慣を続けられます。
            </p>
          </article>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={appPath("/dashboard")}
            className="inline-flex items-center justify-center rounded-full bg-[#76BA1B] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            記録アプリを開く
          </Link>
          <Link
            href={appPath("/login")}
            className="inline-flex items-center justify-center rounded-full border border-[#76BA1B]/40 bg-white px-6 py-3 text-sm font-semibold text-[#2e5f09] transition hover:bg-[#76BA1B]/10"
          >
            ログイン / 新規登録
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#76BA1B]/90 to-[#8ac738]/90 px-6 py-14 text-white sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.2),transparent_35%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm tracking-[0.08em] text-white/90">START TODAY</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-4xl">
            さあ、健康を「楽しむ」習慣を。
          </h2>
          <p className="mt-5 whitespace-pre-line text-sm leading-8 text-white/95 sm:text-base">
            特別なことは必要ありません。
            {"\n"}
            今の自分を、ちょっとだけ記録してみる。
            {"\n"}
            そこから、あなたの新しい毎日が始まります。
          </p>
          <div className="mt-7">
            <Link
              href={appPath("/dashboard")}
              className="inline-flex items-center justify-center rounded-full bg-[#FF9800] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-95"
            >
              ヘルスパークを体験してみる（無料）
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
