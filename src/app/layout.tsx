import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://xeplyai.up.railway.app'),
  title: {
    default: 'XEPLY AI — Website chatbot waitlist',
    template: '%s — XEPLY AI',
  },
  description:
    'Turn your website into an AI sales assistant. Paste your URL, let the AI learn your business, and embed a premium chatbot that captures leads and answers questions 24/7.',
  openGraph: {
    title: 'XEPLY AI — Turn your website into an AI sales assistant',
    description:
      'Paste your website URL. The AI learns your business and answers visitors instantly. Join the waitlist for early access.',
    type: 'website',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XEPLY AI — Turn your website into an AI sales assistant',
    description:
      'Paste your website URL. The AI learns your business and answers visitors instantly. Join the waitlist for early access.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
