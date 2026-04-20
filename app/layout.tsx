import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Restaurant Order System",
  description: "Scan, Order, Enjoy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}