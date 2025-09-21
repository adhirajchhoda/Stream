import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stream Protocol - Real-time Earned Wage Access',
  description: 'Revolutionary earned wage access platform using Zero-Knowledge Proofs for instant, private wage advances.',
  keywords: ['payroll', 'earned wage access', 'zk-proofs', 'blockchain', 'defi'],
  authors: [{ name: 'Stream Protocol Team' }],
  creator: 'Stream Protocol',
  publisher: 'Stream Protocol',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://app.streamprotocol.com'),
  openGraph: {
    title: 'Stream Protocol - Real-time Earned Wage Access',
    description: 'Revolutionary earned wage access platform using Zero-Knowledge Proofs for instant, private wage advances.',
    url: 'https://app.streamprotocol.com',
    siteName: 'Stream Protocol',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stream Protocol',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stream Protocol - Real-time Earned Wage Access',
    description: 'Revolutionary earned wage access platform using Zero-Knowledge Proofs for instant, private wage advances.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2196F3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-text-primary`}>
        <Providers>
          <div id="root">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}