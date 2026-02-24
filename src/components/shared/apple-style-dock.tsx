'use client';

import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from '@/components/ui/dock';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { Logo } from './logo';


type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function UserNav({ user, onSignOut }: { user: User, onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         <div className="h-full w-full flex items-center justify-center cursor-pointer">
            <Avatar className="h-full w-full">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
         </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2" side="top" align="center">
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

export function AppleStyleDock({ items, user, onSignOut }: { items: NavItem[], user: User, onSignOut: () => void }) {
  return (
    <div className='fixed bottom-4 left-1/2 z-50 -translate-x-1/2'>
      <Dock magnification={64} distance={80} panelHeight={60}>
         <DockItem className='rounded-full bg-background'>
            <DockLabel>kanakkmash</DockLabel>
            <Link href="/" className="flex h-full w-full items-center justify-center">
                <DockIcon>
                    <Logo />
                </DockIcon>
            </Link>
          </DockItem>
        {items.map((item) => (
          <DockItem key={item.label} className='rounded-full'>
            <DockLabel>{item.label}</DockLabel>
            <Link href={item.href} className="flex h-full w-full items-center justify-center">
                <DockIcon>
                    <item.icon className='h-full w-full text-foreground/90' />
                </DockIcon>
            </Link>
          </DockItem>
        ))}
         <DockItem className='rounded-full'>
            <DockLabel>Account</DockLabel>
             <UserNav user={user} onSignOut={onSignOut} />
          </DockItem>
      </Dock>
    </div>
  );
}
