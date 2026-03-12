'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Announcement } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, Trash2, Megaphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Reveal } from '@/components/shared/reveal';

export default function AdminAnnouncementsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const q = query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(announcementsData);
      setLoading(false);
    }, (err: any) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'announcements', operation: 'list' }, { cause: err }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);
  
  const handleAddAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get('text') as string;
    const link = formData.get('link') as string;

    if (!text) {
        toast({ variant: 'destructive', title: 'Error', description: 'Announcement text cannot be empty.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(firestore, 'announcements'), {
            text,
            link: link || '',
            isActive: false,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Success', description: 'New announcement created.' });
        form.reset();
    } catch (err: any) {
         if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'announcements', operation: 'create' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create announcement.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    if (!firestore) return;
    const announcementRef = doc(firestore, 'announcements', announcement.id);
    try {
        await updateDoc(announcementRef, { isActive: !announcement.isActive });
        toast({ title: 'Success', description: 'Announcement status updated.' });
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: announcementRef.path, operation: 'update' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !announcementToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(firestore, 'announcements', announcementToDelete.id));
        toast({ title: 'Success', description: 'Announcement deleted.' });
    } catch (err: any) {
         if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `announcements/${announcementToDelete.id}`, operation: 'delete' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete announcement.' });
    } finally {
        setIsSubmitting(false);
        setAnnouncementToDelete(null);
    }
  };


  return (
    <div className="space-y-8">
        <Reveal>
            <div>
                <h1 className="text-3xl font-bold font-headline">Announcements</h1>
                <p className="text-muted-foreground">Create and manage sitewide announcement banners.</p>
            </div>
        </Reveal>
        
        <Reveal delay={0.1}>
            <Card>
                <CardHeader>
                    <CardTitle>Create New Announcement</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddAnnouncement} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="text">Announcement Text</Label>
                                <Input id="text" name="text" required />
                            </div>
                            <div>
                                <Label htmlFor="link">Link (Optional)</Label>
                                <Input id="link" name="link" type="url" placeholder="https://example.com" />
                            </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Announcement
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Reveal>

        <Reveal delay={0.2}>
            <Card>
                <CardHeader>
                    <CardTitle>Manage Announcements</CardTitle>
                    <CardDescription>Only one announcement can be active at a time. The most recently activated one will be shown.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
                        announcements.length > 0 ? (
                             <div className="space-y-4">
                                {announcements.map(item => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                                        <div className="flex-1 space-y-1">
                                            <p className="font-bold">{item.text}</p>
                                            {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{item.link}</a>}
                                            <p className="text-xs text-muted-foreground">Created: {item.createdAt ? format(item.createdAt.toDate(), 'PPP p') : 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center space-x-2">
                                                <Switch id={`active-switch-${item.id}`} checked={item.isActive} onCheckedChange={() => handleToggleActive(item)} />
                                                <Label htmlFor={`active-switch-${item.id}`}>Active</Label>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => setAnnouncementToDelete(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Megaphone className="h-10 w-10 mx-auto mb-2" />
                                <p>No announcements yet.</p>
                            </div>
                        )
                    }
                </CardContent>
            </Card>
        </Reveal>

        <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this announcement. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
