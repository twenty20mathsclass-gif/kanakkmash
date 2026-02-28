'use client';

import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export function AppSidebar({ items, user, onSignOut }: { items: NavItem[], user: User, onSignOut: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { state, setOpenMobile } = useSidebar();

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
    const isActive = (href: string) => {
        if (href === '/admin' || href === '/teacher') {
            return pathname === href;
        }
         // for query params like ?role=student
        if (href.includes('?')) {
            return currentUrl === href;
        }
        return pathname.startsWith(href) && href !== '/';
    };

    const homeHref = user.role === 'admin' ? '/admin' : '/teacher';

    return (
        <Sidebar>
            <SidebarHeader>
                <Link href={homeHref} className={cn("flex items-center gap-2 font-bold p-2", state === 'collapsed' && "justify-center p-0")}>
                    <Image
                        src="/logo mlm@4x.png"
                        alt="kanakkmash"
                        width={32}
                        height={10}
                        className="w-8 h-auto"
                        priority
                    />
                    <span className={cn("text-lg", state === 'collapsed' && "hidden")}>kanakkmash</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={{ children: item.label }}>
                                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                        <Icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className={cn("w-full h-auto p-2 flex justify-start items-center gap-3", state === 'collapsed' && 'w-auto h-10 p-0 justify-center aspect-square')}>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className={cn("flex flex-col items-start text-left", state === 'collapsed' && 'hidden')}>
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground truncate max-w-[120px]">{user.email}</p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-popover-foreground">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => router.push('/profile')} className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
