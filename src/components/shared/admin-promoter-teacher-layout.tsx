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
        <SidebarProvider defaultOpen={false}>
            <div className="flex min-h-screen w-full">
                <AppSidebar items={navItems} user={user} onSignOut={onSignOut} />
                <div className="flex flex-col flex-1 min-w-0 transition-[margin-left] duration-300 ease-in-out">
                    <header className="p-4 border-b h-16 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 w-full">
                        <SidebarTrigger className="hover:bg-accent p-1 rounded-md transition-colors" />
                        <h1 className="font-semibold text-lg">{pageTitle}</h1>
                    </header>
                    <main className="flex-grow p-4 md:p-8 bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px] overflow-x-hidden">
                        <div className="w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
