import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import DemoRibbon from '@/components/ui/DemoRibbon';
import LanguageChooser from '@/components/ui/LanguageChooser';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Kisaan Kavach',
  description: 'Safe payments for rural micro-exports',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoDevanagari.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50">
        <DemoRibbon />
        <LanguageChooser />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}