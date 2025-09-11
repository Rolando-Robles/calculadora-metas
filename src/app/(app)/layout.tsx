'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, PlusSquare, User, Building } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockUser } from '@/lib/data';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/simular', label: 'Simular', icon: Calculator },
  { href: '/capturar', label: 'Capturar', icon: PlusSquare },
  { href: '/perfil', label: 'Perfil', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="hidden md:flex md:flex-col">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-3 py-2">
              <Building className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-headline text-xl font-semibold">
                  Aviva
                </span>
                <span className="text-sm text-muted-foreground">
                  Calculadora Comercial
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn('h-10 justify-start', isActive && 'font-bold')}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="mt-auto border-t p-4">
             <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{mockUser.name}</p>
                  <p className="text-xs text-muted-foreground">{mockUser.kiosco}</p>
                </div>
              </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 bg-background pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
