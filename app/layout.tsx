import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const font = localFont({ src: '../public/fonts/pp-neue-montreal/PPNeueMontreal-Regular.woff2', variable: '--font-montreal', display: 'swap' });
export const metadata: Metadata = { title: 'Student · Finals', description: 'Plan your final. Know what you need.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={font.variable}><body>{children}</body></html>;
}
