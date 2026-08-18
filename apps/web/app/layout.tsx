import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

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
    default: 'Video Meetings',
    template: '%s · Video Meetings',
  },
  description: 'Schedule and run video meetings with your team.',
};

/*
 * HeroUI v3 resolves its palette from `[data-theme]`, so following the system
 * preference needs the attribute set before first paint — a media query alone
 * only reaches `color-scheme`, leaving surfaces light on a dark desktop.
 */
const themeScript = `(function(){var m=window.matchMedia('(prefers-color-scheme: dark)');function apply(e){var dark=e.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark);}apply(m);m.addEventListener('change',apply);})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Script
          id="theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {children}
      </body>
    </html>
  );
}
