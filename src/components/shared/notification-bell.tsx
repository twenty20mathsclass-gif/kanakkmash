'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import type { User, Notification } from '@/lib/definitions';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { Bell, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

export function NotificationBell({ user }: { user: User }) {
  const { firestore } = useFirebase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!firestore) return;
    const notifsQuery = query(collection(firestore, 'users', user.id, 'notifications'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifsData);
      const unread = notifsData.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [firestore, user.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore) return;
    const notifRef = doc(firestore, 'users', user.id, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
  };

  const handleMarkAllAsRead = async () => {
    if (!firestore || unreadCount === 0) return;
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.isRead) {
            const notifRef = doc(firestore, 'users', user.id, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        }
    });
    await batch.commit();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleMarkAllAsRead}>Mark all as read</Button>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
            {notifications.length > 0 ? (
                notifications.map(n => (
                    <DropdownMenuItem key={n.id} asChild className="cursor-pointer data-[disabled]:opacity-100" disabled={n.isRead}>
                        <Link href={n.href} onClick={() => handleMarkAsRead(n.id)} className="flex flex-col items-start gap-1 whitespace-normal">
                            <div className="flex items-center gap-2">
                                {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                                <p className="font-semibold">{n.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{n.body}</p>
                            <p className="text-xs text-muted-foreground">
                                {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ''}
                            </p>
                        </Link>
                    </DropdownMenuItem>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mb-2"/>
                    <p>No new notifications</p>
                </div>
            )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
