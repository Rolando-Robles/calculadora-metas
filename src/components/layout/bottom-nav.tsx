'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, LineChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/originadores', label: 'Calculadora', icon: Sparkles },
  { href: '/proyecciones', label: 'Proyecciones', icon: LineChart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-20 border-t bg-card md:hidden">
      <div className="mx-auto grid h-full max-w-lg grid-cols-2 font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                className={cn(
                  'mb-1 h-7 w-7 text-muted-foreground',
                  isActive && 'text-primary'
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-sm text-muted-foreground',
                  isActive && 'text-primary font-semibold'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
