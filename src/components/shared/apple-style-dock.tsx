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
import { LogOut, UserCircle, Calculator, LogIn, UserPlus } from 'lucide-react';
import type { User } from '@/lib/definitions';


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
      <DropdownMenuContent className="w-56 mb-2" side="bottom" align="start">
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

export function AppleStyleDock({ items, user, onSignOut }: { items: NavItem[], user: User | null, onSignOut?: () => void }) {
  return (
    <div className='fixed top-4 left-4 z-50'>
      <Dock magnification={64} distance={80} panelHeight={60}>
         <DockItem className='rounded-full bg-primary text-primary-foreground'>
            <DockLabel>kanakkmash</DockLabel>
            <DockIcon>
              <Link href={user ? "/dashboard" : "/"} className="flex h-full w-full items-center justify-center">
                  <Calculator className='h-full w-full' />
              </Link>
            </DockIcon>
          </DockItem>
        {items.map((item) => (
          <DockItem key={item.label} className='rounded-full bg-background'>
            <DockLabel>{item.label}</DockLabel>
            <DockIcon>
              <Link href={item.href} className="flex h-full w-full items-center justify-center">
                  <item.icon className='h-full w-full text-foreground/90' />
              </Link>
            </DockIcon>
          </DockItem>
        ))}
         
        {user && onSignOut ? (
            <DockItem className='rounded-full'>
                <DockLabel>Account</DockLabel>
                <UserNav user={user} onSignOut={onSignOut} />
            </DockItem>
        ) : (
            <>
                <DockItem className='rounded-full bg-background'>
                    <DockLabel>Sign In</DockLabel>
                    <DockIcon>
                        <Link href="/sign-in" className="flex h-full w-full items-center justify-center">
                            <LogIn className='h-full w-full text-foreground/90' />
                        </Link>
                    </DockIcon>
                </DockItem>
                <DockItem className='rounded-full bg-background'>
                    <DockLabel>Sign Up</DockLabel>
                    <DockIcon>
                        <Link href="/sign-up" className="flex h-full w-full items-center justify-center">
                            <UserPlus className='h-full w-full text-foreground/90' />
                        </Link>
                    </DockIcon>
                </DockItem>
            </>
        )}
      </Dock>
    </div>
  );
}
