'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, auth } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dock } from '@/components/shared/dock';
import { BookOpen, FlaskConical, LayoutDashboard, LogOut, Users, UserCircle, Loader2, Home, School, Newspaper, Library, CheckSquare } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { Logo } from '@/components/shared/logo';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    router.push('/sign-in');
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const studentNav = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard', label: 'Class', icon: School },
    { href: '/blog', label: 'Blog', icon: Newspaper },
    { href: '/materials', label: 'Material', icon: Library },
    { href: '/courses', label: 'Class Selection', icon: CheckSquare },
    { href: '/practice', label: 'AI Practice', icon: FlaskConical },
  ];

  const teacherNav = [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/students', label: 'Students', icon: Users },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/practice', label: 'AI Practice', icon: FlaskConical },
  ];

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  ];

  const navItems =
    user.role === 'admin'
      ? adminNav
      : user.role === 'teacher'
      ? teacherNav
      : studentNav;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
        <Logo />
        <UserNav user={user} onSignOut={handleSignOut} />
      </header>
      <main className="flex-1 p-4 pl-32 md:p-6 md:pl-32 lg:p-8 lg:pl-32">{children}</main>
      <Dock items={navItems} />
    </div>
  );
}

function UserNav({ user, onSignOut }: { user: User, onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
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
