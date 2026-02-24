'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, auth } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { Dock } from '@/components/shared/dock';
import { BookOpen, FlaskConical, LayoutDashboard, LogOut, Users, UserCircle, Home, School, Newspaper, Library, CheckSquare } from 'lucide-react';
import { PageLoader } from '@/components/shared/page-loader';

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
    return <PageLoader />;
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
    <div className="min-h-screen bg-background">
      <Dock items={navItems} user={user} onSignOut={handleSignOut} />
      <div className="flex min-h-screen flex-col pl-28">
        <main className="flex-grow p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
