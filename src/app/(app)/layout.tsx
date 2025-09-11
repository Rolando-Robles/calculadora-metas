'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, Trophy, User } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/simular', label: 'Simular', icon: Calculator },
  { href: '/incentivos', label: 'Incentivos', icon: Trophy },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="hidden md:flex md:flex-col">
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0L32 9.2376L24 13.8564V23.094L16 27.7128L8 23.094V13.8564L0 9.2376L16 0Z" fill="#2B4EFF"/>
                <path d="M24 13.8564L16 9.2376L8 13.8564L16 18.4752L24 13.8564Z" fill="#00C389"/>
              </svg>

              <div className="flex flex-col">
                <span className="font-headline text-xl font-semibold">
                  Aviva Móvil
                </span>
                <span className="text-xs text-muted-foreground">
                  Calculadora Comercial
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn('h-12 justify-start text-base', isActive && 'font-bold')}
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
            <Link href="/perfil" passHref>
              <Button variant="ghost" className="w-full justify-start h-auto p-0">
                 <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-left">{mockUser.name}</p>
                      <p className="text-xs text-muted-foreground text-left">{mockUser.kiosco}</p>
                    </div>
                  </div>
              </Button>
             </Link>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
