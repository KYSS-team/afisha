'use client';

import './globals.css';
import type { ReactNode } from 'react';
import { Navigation } from './navigation';
import { useEffect, useState } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <html lang="ru">
      <body className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
        <main className="min-h-screen max-w-5xl mx-auto p-6 space-y-8">
          <header className="flex items-center justify-between">
            <div className="text-2xl font-bold">Электронная афиша</div>
            <div className="flex items-center gap-4">
              <Navigation />
              <button onClick={toggleTheme} className="btn secondary">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
