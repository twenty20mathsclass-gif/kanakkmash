
'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
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
import { LogOut, Settings, User as UserIcon, LogIn } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { DockItemContext } from '@/components/ui/dock';

export function UserNav({ user, onSignOut, side, align }: { user?: User | null; onSignOut?: () => void, side?: 'top' | 'bottom' | 'left' | 'right', align?: 'start' | 'center' | 'end' }) {
  const isMobile = useIsMobile();
  const dropdownSide = side || (isMobile ? 'top' : 'bottom');
  const router = useRouter();
  const dockItemContext = React.useContext(DockItemContext);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-full w-full rounded-full p-0 transition-transform hover:scale-110 focus:scale-110">
            <Avatar className="h-full w-full border border-border/50">
              {user?.avatarUrl && !user.avatarUrl.includes('688z9X5/user.png') && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} className="object-cover" />}
              <AvatarFallback className="bg-muted">
                <UserIcon className="h-2/3 w-2/3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover/80 border-border text-popover-foreground backdrop-blur-md mb-2" side={dropdownSide} align={align}>
          {user ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-popover-foreground">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium leading-none">Guest User</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/sign-in')} className="cursor-pointer">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
