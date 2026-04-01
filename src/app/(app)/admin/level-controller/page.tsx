'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Level } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, LayoutGrid, Layers } from 'lucide-react';
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
import { Reveal } from '@/components/shared/reveal';
import { Badge } from '@/components/ui/badge';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');

export default function LevelControllerPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const q = query(collection(firestore, 'levels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Level));
      setLevels(list);
      setLoading(false);
    }, (err: any) => {
      console.error("Error fetching levels:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleAddLevel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const className = formData.get('className') as string;

    if (!name || !className) {
        toast({ variant: 'destructive', title: 'Error', description: 'Name and Class are required.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(firestore, 'levels'), {
            name,
            className,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Success', description: 'New level created.' });
        form.reset();
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create level.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !levelToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(firestore, 'levels', levelToDelete.id));
        toast({ title: 'Success', description: 'Level deleted.' });
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete level.' });
    } finally {
        setIsSubmitting(false);
        setLevelToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
        <Reveal>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Level Controller</h1>
                    <p className="text-muted-foreground">Manage levels class-wise for the Twenty 20 program.</p>
                </div>
            </div>
        </Reveal>
        
        <div className="grid lg:grid-cols-3 gap-8">
            <Reveal delay={0.1} className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Level</CardTitle>
                        <CardDescription>Add a new level and associate it with a class.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddLevel} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="className">Select Class</Label>
                                <Select name="className" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pick a class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Level Name</Label>
                                <Input id="name" name="name" placeholder="e.g. Level 1, Advanced Level" required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Level
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </Reveal>

            <Reveal delay={0.2} className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Existing Levels</CardTitle>
                        <CardDescription>Manage your created levels.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
                            levels.length > 0 ? (
                                <div className="space-y-4">
                                    {levels.map(item => (
                                        <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                            <div className="space-y-1 overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">{item.name}</p>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {item.className}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Created: {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button variant="ghost" size="icon" onClick={() => setLevelToDelete(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <Layers className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>No levels defined yet.</p>
                                </div>
                            )
                        }
                    </CardContent>
                </Card>
            </Reveal>
        </div>

        <AlertDialog open={!!levelToDelete} onOpenChange={(open) => !open && setLevelToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Deleting "{levelToDelete?.name}" will remove it from the available options.
                    </AlertDialogDescription>
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
