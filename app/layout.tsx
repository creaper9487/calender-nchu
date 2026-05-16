import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "中興夠咪亭",
  description: "從興大課表找出和朋友的共同空堂，一起夠咪亭。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={geistSans.variable}>
      <body className="scrollbar-hidden">{children}</body>
    </html>
  );
}
