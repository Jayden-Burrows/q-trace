// app/layout.tsx
import type { Metadata } from "next";
import { Khand, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const khand = Khand({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-khand", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Q-trace",
  description: "Upload a QR code image to see where it leads and what security engines say about the link.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${khand.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap"
        />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}