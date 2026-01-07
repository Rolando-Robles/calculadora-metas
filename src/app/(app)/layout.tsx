'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, LineChart, Settings, LogOut, Shield, Menu, User } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/originadores', label: 'Calculadora', icon: Sparkles },
  { href: '/proyecciones', label: 'Proyecciones', icon: LineChart },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background">
          {/* Mobile Header */}
          <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gradient-to-r from-primary to-secondary text-white shadow-md">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold text-sm truncate">Aviva</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-white hover:bg-white/20"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-white hover:bg-white/20"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userProfile?.name || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                        {isAdmin && (
                          <Badge variant="secondary" className="text-xs w-fit">Admin</Badge>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <Sidebar className="hidden md:flex md:flex-col">
            <SidebarHeader className="border-b p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>

                <div className="flex flex-col">
                  <span className="font-headline text-base font-semibold">
                    Calculadora de incentivos Aviva
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Originadores de Excelencia
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
                      <Link href={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={cn('h-12 justify-start text-base', isActive && 'font-bold')}
                        >
                          <div>
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}

                {isAdmin && (
                  <>
                    <div className="my-2 px-3">
                      <div className="h-px bg-border" />
                    </div>
                    <SidebarMenuItem>
                      <Link href="/admin">
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === '/admin'}
                          className={cn('h-12 justify-start text-base', pathname === '/admin' && 'font-bold')}
                        >
                          <div>
                            <Shield className="h-5 w-5" />
                            <span>Admin</span>
                            <Badge variant="secondary" className="ml-auto text-xs">Admin</Badge>
                          </div>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="mt-auto border-t p-4 space-y-2">
              <div className="flex items-center gap-3 px-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-white">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{userProfile?.name || 'Usuario'}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">{userProfile?.email}</p>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 md:pb-0 pt-14 md:pt-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
