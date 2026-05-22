import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Gaint Mart',
  description: 'Unified Inventory and POS System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-[#0A0B0E] text-[#E5E1DA] min-h-screen selection:bg-[#D4AF37] selection:text-black">
        {children}
        <Toaster 
          theme="dark" 
          toastOptions={{
            style: {
              background: '#0D0F13',
              border: '1px solid #2A2A2A',
              color: '#D4AF37',
              borderRadius: '0',
            }
          }}
        />
      </body>
    </html>
  );
}
