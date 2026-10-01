import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "ConDex",
  description: "A private rolodex. Search people the way you remember them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
