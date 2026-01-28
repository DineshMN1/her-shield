import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import OneSignalInit from './components/OneSignalInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Health SOS - Pregnancy Care',
  description: 'Emergency health assistance for pregnant women',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Health SOS',
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
