import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/layout/Providers';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'dark light' };
export const metadata: Metadata = {
  title: { default: 'Meeting Automator Admin', template: '%s | Meeting Automator Admin' },
  description: 'Protected administration workspace for Meeting Automator.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className="font-sans antialiased"><Providers>{children}</Providers></body></html>;
}
