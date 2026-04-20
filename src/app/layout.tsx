import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mes Archives Familiales',
  description: 'Numérisez et analysez des objets historiques',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans text-[#1a1a1a] bg-[#fdfcfb] min-h-screen custom-scrollbar">
        {children}
      </body>
    </html>
  );
}
