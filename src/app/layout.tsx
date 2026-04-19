import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { FirebaseProvider } from "@/components/firebase-provider";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Health Park",
    template: "%s | Health Park",
  },
  description:
    "体重・歩数・血圧・処方・食事・通院先を、端末のブラウザ内に記録するシンプルなヘルス記録アプリ。",
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
        <FirebaseProvider>
          <AppHeader />
          <div className="min-h-0 flex-1">{children}</div>
          <AppFooter />
        </FirebaseProvider>
      </body>
    </html>
  );
}
