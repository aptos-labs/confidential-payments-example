import '@/theme/styles.scss';
import '../../envConfig';

import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { PropsWithChildren } from 'react';

import { appFontClassName } from '@/theme/fonts';
import { cn } from '@/theme/utils';
import { UiToaster } from '@/ui/UiToaster';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: '' });

  return {
    metadataBase: new URL('https://example.com/'),
    title: t('metadata.title'),
    description: t('metadata.description'),

    openGraph: {
      title: t('metadata.openGraph.description'),
      description: t('metadata.openGraph.description'),
      type: 'website',
      url: t('metadata.openGraph.url'),
      siteName: t('metadata.openGraph.siteName'),
      images: t('metadata.openGraph.images'),
    },

    twitter: {
      title: t('metadata.twitter.title'),
      description: t('metadata.twitter.description'),
      card: 'summary_large_image',
      images: t('metadata.twitter.images'),
      site: t('metadata.twitter.site'),
    },
  };
}

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn(appFontClassName, 'font-primary')}
      suppressHydrationWarning
      dir='ltr'
    >
      <head>
        <link
          type='image/png'
          href='/branding/favicon-32x32.png'
          rel='icon'
          media='(prefers-color-scheme: light)'
        />
        <link
          type='image/png'
          href='/branding/favicon-32x32.png'
          rel='icon'
          media='(prefers-color-scheme: dark)'
        />
        <link rel='apple-touch-icon' href='/branding/apple-touch-icon.png' />
      </head>

      <body>
        <NextIntlClientProvider>
          <ThemeProvider attribute='class'>
            <div id='root'>{children}</div>
            <UiToaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
