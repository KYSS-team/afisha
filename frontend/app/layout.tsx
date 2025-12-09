import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Афиша событий',
  description: 'MVP системы электронной афиши'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900">
        <main className="min-h-screen max-w-5xl mx-auto p-6 space-y-8">
          <header className="flex items-center justify-between">
            <div className="text-2xl font-bold">Электронная афиша</div>
            <nav className="flex gap-3 text-sm">
              <a href="/auth/login" className="link">Войти</a>
              <a href="/auth/register" className="link">Регистрация</a>
              <a href="/events" className="link">События</a>
              <a href="/admin" className="link">Админ</a>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
