'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Home, LogIn, UserPlus, Calendar, Shield } from 'lucide-react';

type UserRole = 'ADMIN' | 'USER' | 'GUEST';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/auth/login', label: 'Войти', icon: LogIn },
  { href: '/auth/register', label: 'Регистрация', icon: UserPlus },
  { href: '/events', label: 'События', icon: Calendar },
  { href: '/admin', label: 'Админ', icon: Shield, requiredRole: 'ADMIN' }
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
    <TooltipProvider>
      <nav aria-label="Основная навигация" className="flex items-center gap-2">
        {NAV_ITEMS.filter((item) => {
          if (item.href === '/auth/login' || item.href === '/auth/register') {
            return role === 'GUEST';
          }
          if (item.href === '/admin') {
            return role === 'ADMIN';
          }
          return true;
        }).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button asChild variant={active ? 'secondary' : 'ghost'} size="icon">
                  <Link href={item.href} aria-label={item.label}>
                    <Icon className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
