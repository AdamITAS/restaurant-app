import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "RistoApp | Order & Pay",
  description: "Scan, Order, Enjoy. The modern way to dine in.",
  // Nasconde la barra degli indirizzi su iOS quando aggiunto alla home
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RistoApp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Impedisce lo zoom indesiderato facendo doppio tap sui prezzi
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      {/* 
        overscroll-none: Blocca il rimbalzo elastico di iOS/Android ai limiti dello scroll
        bg-slate-50: Colore di sfondo di default per evitare flash bianchi durante i caricamenti
      */}
      <body className={`${inter.className} overscroll-none bg-slate-50`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}