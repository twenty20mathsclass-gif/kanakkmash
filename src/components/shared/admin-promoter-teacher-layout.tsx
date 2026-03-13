
'use client';
import {
    SidebarProvider,
    SidebarTrigger,
  } from '@/components/ui/sidebar';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { AppSidebar } from '@/components/shared/app-sidebar';

type NavItem = { href: string; label: string; icon: LucideIcon; };

export default function AdminPromoterTeacherLayout({ children, navItems, user, onSignOut, pageTitle }: {
    children: React.ReactNode;
    navItems: NavItem[];
    user: User;
    onSignOut: () => void;
    pageTitle: string;
}) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AppSidebar items={navItems} user={user} onSignOut={onSignOut} />
                <div className="flex flex-col flex-1 md:ml-[--sidebar-width-icon] group-data-[state=expanded]:md:ml-[--sidebar-width] transition-[margin-left] duration-300 ease-in-out">
                    <header className="p-4 border-b h-16 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="font-semibold text-lg">{pageTitle}</h1>
                    </header>
                    <main className="flex-grow p-4 md:p-6 bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px]">
                        <div className="mx-auto w-full max-w-screen-2xl">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
