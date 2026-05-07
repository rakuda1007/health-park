import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AuthProvider } from "@/contexts/auth-context";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
const adsenseSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim();
const adsenseEnabled = Boolean(adsenseClient && adsenseSlot);

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Health Park",
    template: "%s | Health Park",
  },
  description:
    "体重・歩数・血圧・処方・食事・病院・既往歴を記録するシンプルなヘルス記録アプリ。メールログインでクラウド同期にも対応。",
  applicationName: "Health Park",
  icons: {
    icon: "/icons/HealthPark.png",
    apple: "/icons/HealthPark.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-w-0 flex-col bg-[color:var(--hp-background)]">
        {adsenseEnabled && adsenseClient ? (
          <Script
            id="google-adsense"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
              adsenseClient,
            )}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <AuthProvider>
          <AppHeader />
          <div className="min-h-0 flex-1">{children}</div>
          <AppFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
