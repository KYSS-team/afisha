'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';

type UserRole = 'ADMIN' | 'USER' | 'GUEST';

const iconProps = (props: ComponentProps<'svg'>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  ...props
});

const HomeIcon = (props: ComponentProps<'svg'>) => (
  <svg {...iconProps(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 10.5L12 3l8.25 7.5" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 10.875V20.25a.75.75 0 00.75.75H9.75V15a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v6h4.5a.75.75 0 00.75-.75v-9.375"
    />
  </svg>
);

const KeyIcon = (props: ComponentProps<'svg'>) => (
  <svg {...iconProps(props)}>
    <circle cx="15" cy="9" r="4.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 12.75L7 17" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 17H6.75a.75.75 0 00-.75.75V19.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 15.5 11.5 17" />
  </svg>
);

const UserPlusIcon = (props: ComponentProps<'svg'>) => (
  <svg {...iconProps(props)}>
    <circle cx="12" cy="9" r="3.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 19.25a6 6 0 0111 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 10.5h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 9v3" />
  </svg>
);

const CalendarIcon = (props: ComponentProps<'svg'>) => (
  <svg {...iconProps(props)}>
    <rect x="4" y="5.5" width="16" height="14" rx="2" ry="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5v4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3.5v4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9.5h16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6" />
  </svg>
);

const ShieldIcon = (props: ComponentProps<'svg'>) => (
  <svg {...iconProps(props)}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.5l7 3v5.25c0 3.351-2.41 6.405-7 8.75-4.59-2.345-7-5.399-7-8.75V6.5l7-3z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l2 2 3.5-4" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: (props: ComponentProps<'svg'>) => JSX.Element;
  requiredRole?: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon },
  { href: '/auth/login', label: 'Войти', icon: KeyIcon },
  { href: '/auth/register', label: 'Регистрация', icon: UserPlusIcon },
  { href: '/events', label: 'События', icon: CalendarIcon },
  { href: '/admin', label: 'Админ', icon: ShieldIcon, requiredRole: 'ADMIN' }
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
    <nav className="nav" aria-label="Основная навигация">
      {NAV_ITEMS.filter((item) => !item.requiredRole || item.requiredRole === role).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${active ? 'active' : ''}`}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="icon" aria-hidden />
            <span className="nav-text">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
