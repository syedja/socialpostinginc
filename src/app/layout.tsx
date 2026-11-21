import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "Social Posting Inc. — Fresh posts for your business, every day",
  description:
    "Social media posting for local businesses. AI-written posts for Facebook, Instagram and Google Business Profile, scheduled automatically. See your first week free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen bg-canvas text-ink">{children}</body>
    </html>
  );
}
