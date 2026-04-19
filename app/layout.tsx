import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import OneSignalInit from './components/OneSignalInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Health SOS - Pregnancy Care',
  description: 'Emergency health assistance for pregnant women — instant SOS, video consultations, and 24/7 AI support.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Health SOS',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ff6b9d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <OneSignalInit />
          {children}
        </Providers>
      </body>
    </html>
  );
}
