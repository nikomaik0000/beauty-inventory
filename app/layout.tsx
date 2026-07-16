import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Beauty Inventory — Personal Skincare Inventory",
  description: "記錄您的保養品收藏，掌握截止日期，不再遺忘心愛的好物。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Beauty Inventory",
  },
};

// Light mode only — Dark Mode was removed in Phase 4B.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F4",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* Product-title serif stack is "Songti SC" / "Apple LiSong" (macOS/iOS
            system fonts) first, so this is only a fallback for other platforms —
            loaded as a plain stylesheet link rather than next/font, since its
            subset name isn't something we can safely verify without a live
            network fetch of Google's font metadata. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this rule targets the old Pages Router's _document.js; a <link> in the App Router root layout's <head> is the correct, supported place for this. */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${fraunces.variable} font-sans`}>{children}</body>
    </html>
  );
}
