import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TikVibe - Short Video Platform",
  description: "Create, share, and discover amazing short videos. Join millions of creators and viewers on TikVibe.",
  keywords: ["TikVibe", "short videos", "video sharing", "social media", "content creator", "viral videos"],
  authors: [{ name: "TikVibe Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "TikVibe - Short Video Platform",
    description: "Create, share, and discover amazing short videos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TikVibe - Short Video Platform",
    description: "Create, share, and discover amazing short videos",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
