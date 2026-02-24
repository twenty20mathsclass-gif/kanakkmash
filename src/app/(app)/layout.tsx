'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, auth } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { BookOpen, FlaskConical, LayoutDashboard, Newspaper, Library, Users } from 'lucide-react';
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
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/practice', label: 'AI Practice', icon: FlaskConical },
    { href: '/blog', label: 'Blog', icon: Newspaper },
    { href: '/materials', label: 'Materials', icon: Library },
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
    <div className="flex min-h-screen flex-col bg-background">
      <AppleStyleDock items={navItems} user={user} onSignOut={handleSignOut} />
      <main className="flex-grow p-4 pt-20 md:p-6 md:pt-20 lg:p-8 lg:pt-20">{children}</main>
    </div>
  );
}
