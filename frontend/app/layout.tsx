import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOVEREIGN WORKBENCH // Industrial Offline AI",
  description:
    "Self-hosted, offline AI agent system for refineries, defense, and heavy industry with zero cloud telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased font-sans bg-white text-neutral-950`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-950 selection:bg-neutral-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
