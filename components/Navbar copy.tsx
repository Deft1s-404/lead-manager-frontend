'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import clsx from 'clsx';

import { BrandMark } from './BrandMark';
import { Loading } from './Loading';
import { useAuth } from '../hooks/useAuth';

type IconName =
  | 'dashboard'
  | 'users'
  | 'funnel'
  | 'calendar'
  | 'megaphone'
  | 'puzzle'
  | 'chart'
  | 'clock';

type LinkItem = { href: string; label: string; icon: IconName };

const links: LinkItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/clients', label: 'Clientes', icon: 'users' },
  { href: '/alunos', label: 'Alunos', icon: 'users' },
  { href: '/leads', label: 'Leads', icon: 'funnel' },
  { href: '/course-leads', label: 'Leads Curso', icon: 'funnel' },
  { href: '/appointments', label: 'Consultas', icon: 'calendar' },
  { href: '/campaigns', label: 'Campanhas', icon: 'megaphone' },
  { href: '/integrations', label: 'Integrações', icon: 'puzzle' },
  { href: '/reports', label: 'Relatórios', icon: 'chart' }
];

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="5" rx="1" />
          <rect x="13" y="10" width="8" height="11" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
          <circle cx="17" cy="9" r="2" />
          <path d="M14.5 21c.4-1.9 1.9-3.5 4-4" />
        </svg>
      );
    case 'funnel':
      return (
        <svg {...common}>
          <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg {...common}>
          <path d="M3 11l12-5v12L3 13V11z" />
          <path d="M15 8h2a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-2" />
          <path d="M3 13v4a3 3 0 0 0 3 3h2" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg {...common}>
          <path d="M10 3h4a1 1 0 0 1 1 1v2a2 2 0 1 0 2 2h2a1 1 0 0 1 1 1v4h-3a2 2 0 1 0 0 4h3v4a1 1 0 0 1-1 1h-4v-3a2 2 0 1 0-4 0v3H6a1 1 0 0 1-1-1v-4H2a1 1 0 0 1-1-1v-4h3a2 2 0 1 0 0-4H1V4a1 1 0 0 1 1-1h4v3a2 2 0 1 0 4 0V3z" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 20V6M10 20V10M16 20v-7M21 20H3" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    default:
      return null;
  }
}

const AccountDetails = ({
  label,
  name,
  email
}: {
  label: string;
  name?: string | null;
  email?: string | null;
}) => (
  <div>
    <p className="text-[11px] uppercase text-gray-400">{label}</p>
    <p className="font-semibold text-gray-700">{name ?? '—'}</p>
    <p className="text-gray-400">{email ?? '—'}</p>
  </div>
);

export const Navbar = () => {
  const pathname = usePathname();
  const { user, seller, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigationLinks = useMemo(() => {
    const base =
      user?.role !== 'ADMIN' ? links.filter((link) => link.href !== '/integrations') : [...links];
    base.push({
      href: '/attendance',
      label: seller ? 'Atendimento' : 'Agenda dos vendedores',
      icon: 'clock'
    });
    return base;
  }, [seller, user?.role]);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    window.setTimeout(() => {
      logout();
    }, 400);
  };

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <span className="block h-0.5 w-5 bg-current"></span>
          <span className="mt-1.5 block h-0.5 w-5 bg-current"></span>
          <span className="mt-1.5 block h-0.5 w-5 bg-current"></span>
        </button>
        <BrandMark iconClassName="h-7 w-7 text-xs" titleClassName="text-base" />
        <div className="w-7" />
      </header>

      {/* Mobile drawer */}
      <div className={clsx('fixed inset-0 z-50 md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
        <aside
          className={clsx(
            'absolute left-0 top-0 h-full w-72 translate-x-0 border-r bg-white shadow-xl transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <BrandMark iconClassName="h-8 w-8 text-xs" titleClassName="text-lg" />
            <button
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              X
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 text-sm text-gray-700">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'block rounded-md px-3 py-2 transition',
                  pathname.startsWith(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-gray-100 hover:text-primary-dark'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon name={link.icon} className="h-5 w-5" />
                  <span>{link.label}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t px-4 py-4">
            <div className="mb-3 text-xs space-y-3">
              <AccountDetails label="Empresa" name={user?.name} email={user?.email} />
              {seller && (
                <div className="border-t border-dashed border-gray-200 pt-2">
                  <AccountDetails label="Vendedor" name={seller.name} email={seller.email} />
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={clsx(
                'w-full rounded-lg border border-primary px-3 py-2 text-xs font-semibold transition',
                isLoggingOut
                  ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                  : 'text-primary hover:bg-primary hover:text-white'
              )}
            >
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </aside>
      </div>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col w-64 shrink-0 border-r bg-white">
        <div className="flex items-center gap-3 px-5 py-4">
          <BrandMark iconClassName="h-9 w-9 text-sm" titleClassName="text-lg" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 text-sm text-gray-700">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'block rounded-md px-3 py-2 transition',
                pathname.startsWith(link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 hover:text-primary-dark'
              )}
            >
              <span className="flex items-center gap-3">
                <Icon name={link.icon} className="h-5 w-5" />
                <span>{link.label}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t px-4 py-4">
          <div className="mb-3 text-xs space-y-3">
            <AccountDetails label="Empresa" name={user?.name} email={user?.email} />
            {seller && (
              <div className="border-t border-dashed border-gray-200 pt-2">
                <AccountDetails label="Vendedor" name={seller.name} email={seller.email} />
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={clsx(
              'w-full rounded-lg border border-primary px-3 py-2 text-xs font-semibold transition',
              isLoggingOut
                ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                : 'text-primary hover:bg-primary hover:text-white'
            )}
          >
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </aside>

      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loading />
        </div>
      )}
    </>
  );
};
