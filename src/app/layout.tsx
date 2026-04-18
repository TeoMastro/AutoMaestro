import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme-provider';
import { APP_NAME } from '@/lib/constants';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Branded Client Portal for n8n Workflows`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Give your clients a branded portal to interact with your n8n automations. Manage companies, workflows, documents, and monitor everything from one dashboard.',
  openGraph: {
    title: `${APP_NAME} — Branded Client Portal for n8n Workflows`,
    description:
      'The glue between you, your customers, and your n8n workflows. Manage companies, deploy automations, and keep full visibility.',
    siteName: APP_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Branded Client Portal for n8n Workflows`,
    description:
      'Give your clients a branded portal to interact with your n8n automations. Full observability for managers and clients.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
