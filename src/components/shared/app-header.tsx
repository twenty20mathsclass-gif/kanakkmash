'use client';

import Link from 'next/link';
import { Logo } from './logo';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/definitions';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle, Menu } from 'lucide-react';
import React from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AppHeaderProps = {
  items: NavItem[];
  user: User;
  onSignOut: () => void;
};

export function AppHeader({ items, user, onSignOut }: AppHeaderProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin' || href === '/teacher') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-4 md:flex">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  isActive(item.href)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full max-w-xs p-0">
                        <div className="p-4 border-b">
                            <Logo />
                        </div>
                        <nav className="mt-4 grid gap-1 p-2">
                        {items.map((item) => (
                            <SheetClose asChild key={item.label}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium',
                                        isActive(item.href)
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-muted-foreground hover:bg-accent/80'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            </SheetClose>
                        ))}
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
            <UserNav user={user} onSignOut={onSignOut} />
        </div>

      </div>
    </header>
  );
}

function UserNav({ user, onSignOut }: { user: User; onSignOut: () => void }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4"/>
              Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
              <button onClick={onSignOut} className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
