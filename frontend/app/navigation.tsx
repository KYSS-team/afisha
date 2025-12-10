'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, LogIn, UserPlus, Calendar, Shield, LogOut } from 'lucide-react';

type UserRole = 'ADMIN' | 'USER' | 'GUEST';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: UserRole;
  guestOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/events', label: 'События', icon: Calendar },
  { href: '/auth/login', label: 'Войти', icon: LogIn, guestOnly: true },
  { href: '/auth/register', label: 'Регистрация', icon: UserPlus, guestOnly: true },
  { href: '/admin', label: 'Админ', icon: Shield, requiredRole: 'ADMIN' }
];

function resolveStoredRole(): UserRole {
  if (typeof window === 'undefined') return 'GUEST';
  const storedRole = localStorage.getItem('userRole')?.toUpperCase();
  if (storedRole === 'ADMIN') return 'ADMIN';
  if (storedRole) return 'USER';
  return 'GUEST';
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('GUEST');

  useEffect(() => {
    setRole(resolveStoredRole());
    const syncRole = () => setRole(resolveStoredRole());
    window.addEventListener('storage', syncRole);
    window.addEventListener('auth:changed', syncRole);
    return () => {
      window.removeEventListener('storage', syncRole);
      window.removeEventListener('auth:changed', syncRole);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('auth:changed'));
    setRole('GUEST');
    router.push('/auth/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navItems = useMemo(() => {
    const baseItems = NAV_ITEMS.filter((item) => {
      if (item.guestOnly) return role === 'GUEST';
      if (item.requiredRole === 'ADMIN') return role === 'ADMIN';
      return true;
    });

    if (role !== 'GUEST') {
      baseItems.push({ href: '#logout', label: 'Выйти', icon: LogOut });
    }

    return baseItems;
  }, [role]);

  return (
    <nav aria-label="Основная навигация" className="flex items-center gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const isLogout = item.href === '#logout';

        return (
          <Button
            key={item.href}
            asChild={!isLogout}
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={isLogout ? handleLogout : undefined}
          >
            {isLogout ? (
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </span>
            ) : (
              <Link href={item.href} aria-label={item.label} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )}
          </Button>
        );
      })}
    </nav>
  );
}
