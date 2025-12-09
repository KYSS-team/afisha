'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

type UserRole = 'ADMIN' | 'USER' | 'GUEST';

interface NavItem {
  href: string;
  label: string;
  requiredRole?: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная' },
  { href: '/auth/login', label: 'Войти' },
  { href: '/auth/register', label: 'Регистрация' },
  { href: '/events', label: 'События' },
  { href: '/admin', label: 'Админ', requiredRole: 'ADMIN' }
];

function resolveStoredRole(): UserRole {
  if (typeof window === 'undefined') return 'GUEST';
  const storedRole = localStorage.getItem('userRole');
  if (storedRole === 'ADMIN') return 'ADMIN';
  if (storedRole) return 'USER';
  return 'GUEST';
}

export function Navigation() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>('GUEST');

  useEffect(() => {
    setRole(resolveStoredRole());
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav aria-label="Основная навигация">
      {NAV_ITEMS.filter((item) => !item.requiredRole || item.requiredRole === role).map((item) => {
        const active = isActive(item.href);
        return (
          <Button asChild key={item.href} variant={active ? 'secondary' : 'ghost'}>
            <Link
              href={item.href}
              aria-label={item.label}
              title={item.label}
            >
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
