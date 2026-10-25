import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900']
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800']
});

export const viewport: Viewport = {
  themeColor: '#080a10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5
};

export const metadata: Metadata = {
  metadataBase: new URL('https://kingsbilliards.com'),
  title: 'Download Kings Billiards & Domino APK v2.79 Resmi 2026 (Anti-Banned)',
  description: 'Download Kings Billiards & Domino APK Versi Terbaru v2.79 (160 MB) 2026. Game Domino Gaple, Qiu Qiu 99, 8-Ball Billiards & Slot Kasino No. 1 Indonesia dengan grafis HD dan bonus koin melimpah.',
  keywords: [
    'download kings billiards apk',
    'download domino gaple apk',
    'qiu qiu 99 apk',
    'billiard online android',
    'slot kasino gacor apk',
    'royal dream apk versi terbaru',
    'kings domino apk'
  ],
  authors: [{ name: 'Kings Gaming Studio' }],
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: 'Download Kings Billiards & Domino APK v2.79 Resmi (Anti-Banned)',
    description: 'Nikmati Domino Gaple, Qiu Qiu, 8-Ball Billiards dan Slot Kasino terbaik dalam satu aplikasi ringan, aman, dan bebas malware!',
    url: 'https://kingsbilliards.com/',
    siteName: 'Kings Billiards & Domino',
    images: [
      {
        url: '/assets/hero_showcase.jpg',
        width: 1200,
        height: 630,
        alt: 'Kings Billiards & Domino Official Showcase'
      }
    ],
    locale: 'id_ID',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download Kings Billiards & Domino APK v2.79 Resmi',
    description: 'Game Domino Gaple, Qiu Qiu 99, 8-Ball Billiards & Slot Kasino No. 1 Indonesia!',
    images: ['/assets/hero_showcase.jpg']
  },
  icons: {
    icon: '/assets/kings_billiards_logo.png',
    apple: '/assets/kings_billiards_logo.png'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className="antialiased">
        <div className="bg-ambient-1" />
        <div className="bg-ambient-2" />
        <div className="bg-ambient-3" />
        {children}
      </body>
    </html>
  );
}
