
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
import { LogOut, Settings } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { DockItemContext } from '@/components/ui/dock';

export function UserNav({ user, onSignOut, side, align }: { user: User; onSignOut: () => void, side?: 'top' | 'bottom' | 'left' | 'right', align?: 'start' | 'center' | 'end' }) {
  const isMobile = useIsMobile();
  const dropdownSide = side || (isMobile ? 'top' : 'bottom');
  const router = useRouter();
  const dockItemContext = React.useContext(DockItemContext);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-full w-full rounded-full p-0 transition-transform hover:scale-110 focus:scale-110">
            <Avatar className="h-full w-full">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover/80 border-border text-popover-foreground backdrop-blur-md mb-2" side={dropdownSide} align={align}>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
