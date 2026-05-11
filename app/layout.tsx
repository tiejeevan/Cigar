import type {Metadata} from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Cigarillo Archive',
  description: 'Track cigarillo inventory and order levels',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full m-0`}>
      <body suppressHydrationWarning className="bg-[#0A0B0E] min-h-screen text-[#E5E1DA] font-sans antialiased flex flex-col overflow-hidden h-full m-0">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
