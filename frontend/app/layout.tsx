import './globals.css';
import type { ReactNode } from 'react';
import { Navigation } from './navigation';

export const metadata = {
  title: 'Афиша событий',
  description: 'MVP системы электронной афиши'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="text-slate-900">
        <main className="min-h-screen max-w-5xl mx-auto p-6 space-y-8">
          <header className="flex items-center justify-between">
            <div className="text-2xl font-bold">Электронная афиша</div>
            <Navigation />
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
