import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "@/components/navigation";
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
  title: "LexNormAI - AI-Powered Course Content Mapping",
  description: "Map your educational content to relevant occupational standards using AI. Supports NOS, ISCO, SOC, and other international standards.",
  keywords: ["AI", "education", "course mapping", "occupational standards", "NOS", "machine learning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Navigation />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
