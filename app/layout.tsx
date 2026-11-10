import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const font = localFont({ src: [
  { path: '../public/fonts/geist/Geist-Regular.ttf', weight: '400' },
  { path: '../public/fonts/geist/Geist-Medium.ttf', weight: '500' },
  { path: '../public/fonts/geist/Geist-SemiBold.ttf', weight: '600' },
], variable: '--font-geist', display: 'swap' });
export const metadata: Metadata = { title: 'Student · Finals', description: 'Final exam calculator.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" style={{ colorScheme: 'dark' }} className={font.variable}><body>{children}</body></html>;
}
