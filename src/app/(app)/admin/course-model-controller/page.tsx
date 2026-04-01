'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { CourseModel } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, Trash2, LayoutGrid, AlertCircle, Edit } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function AdminCourseModelControllerPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [models, setModels] = useState<CourseModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<CourseModel | null>(null);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const q = query(collection(firestore, 'courseModels'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModel));
      list.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setModels(list);
      setLoading(false);
    }, (err: any) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseModels', operation: 'list' }, { cause: err }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);
  
  const handleAddModel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const configType = formData.get('configType') as CourseModel['configType'];
    const description = formData.get('description') as string;

    if (!name || !configType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Name and Config Type are required.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(firestore, 'courseModels'), {
            name,
            configType,
            description: description || '',
            isActive: true,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Success', description: 'New course model created.' });
        form.reset();
    } catch (err: any) {
         if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseModels', operation: 'create' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create course model.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (model: CourseModel) => {
    if (!firestore) return;
    const modelRef = doc(firestore, 'courseModels', model.id);
    try {
        await updateDoc(modelRef, { isActive: !model.isActive });
        toast({ title: 'Success', description: 'Course model status updated.' });
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: modelRef.path, operation: 'update' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !modelToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(firestore, 'courseModels', modelToDelete.id));
        toast({ title: 'Success', description: 'Course model deleted.' });
    } catch (err: any) {
         if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `courseModels/${modelToDelete.id}`, operation: 'delete' }, { cause: err }));
        }
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete model.' });
    } finally {
        setIsSubmitting(false);
        setModelToDelete(null);
    }
  };

    const [modelToEdit, setModelToEdit] = useState<CourseModel | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleEditModel = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !modelToEdit) return;

        const form = e.currentTarget;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        if (!name) {
            toast({ variant: 'destructive', title: 'Error', description: 'Name is required.' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'courseModels', modelToEdit.id), {
                name,
                description: description || '',
                updatedAt: serverTimestamp()
            });
            toast({ title: 'Success', description: 'Course model updated.' });
            setIsEditDialogOpen(false);
            setModelToEdit(null);
        } catch (err: any) {
             if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `courseModels/${modelToEdit.id}`, operation: 'update' }, { cause: err }));
            }
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update course model.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleInitializeDefaults = async () => {
        if (!firestore) return;
        setIsSubmitting(true);
        const defaults = [
            { name: 'MATHS ONLINE TUITION', configType: 'class-syllabus', isActive: true, description: 'Standard tuition classes with syllabus options.' },
            { name: 'TWENTY 20 BASIC MATHS', configType: 'level', isActive: true, description: 'Level-based foundational maths program.' },
            { name: 'COMPETITIVE EXAM', configType: 'competitive-exam', isActive: true, description: 'Preparation for competitive entrance exams.' }
        ];

        try {
            for (const def of defaults) {
                await addDoc(collection(firestore, 'courseModels'), { ...def, createdAt: serverTimestamp() });
            }
            toast({ title: 'Initialized', description: 'Default models have been created.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to initialize defaults.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <Reveal>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Course Model Controller</h1>
                        <p className="text-muted-foreground">Manage the foundational course categories available on the platform.</p>
                    </div>
                    {models.length === 0 && !loading && (
                        <Button onClick={handleInitializeDefaults} disabled={isSubmitting} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                            Initialize Standard Defaults
                        </Button>
                    )}
                </div>
            </Reveal>
            
            <div className="grid lg:grid-cols-3 gap-8">
                <Reveal delay={0.1} className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create New Model</CardTitle>
                            <CardDescription>Add a new course template with specific configurations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddModel} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Model Name</Label>
                                    <Input id="name" name="name" placeholder="e.g. Foundation Course" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="configType">Configuration Mode</Label>
                                    <Select name="configType" defaultValue="none">
                                        <SelectTrigger><SelectValue placeholder="Select logic mode" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="class-syllabus">Class & Syllabus</SelectItem>
                                            <SelectItem value="level">Twenty 20 Levels</SelectItem>
                                            <SelectItem value="competitive-exam">Competitive Exams</SelectItem>
                                            <SelectItem value="none">Standard (No extra fields)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Determines which extra fields are shown in sign-up and scheduling.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input id="description" name="description" placeholder="Brief purpose of this model" />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Course Model
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </Reveal>

                <Reveal delay={0.2} className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Models</CardTitle>
                            <CardDescription>Manage your active course templates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
                                models.length > 0 ? (
                                    <div className="space-y-4">
                                        {models.map(item => (
                                            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                                <div className="space-y-1 overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold">{item.name}</p>
                                                        <Badge variant="outline" className="text-[10px] capitalize">
                                                            {item.configType.replace('-', ' ')}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description || 'No description provided.'}</p>
                                                    <p className="text-[10px] text-muted-foreground">Created: {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch id={`active-switch-${item.id}`} checked={item.isActive} onCheckedChange={() => handleToggleActive(item)} />
                                                        <Label htmlFor={`active-switch-${item.id}`} className="text-xs">Active</Label>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => { setModelToEdit(item); setIsEditDialogOpen(true); }}><Edit className="h-4 w-4 text-primary" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => setModelToDelete(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <LayoutGrid className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No course models defined yet.</p>
                                        <p className="text-xs">Click "Initialize Standard Defaults" to start with standard options.</p>
                                    </div>
                                )
                            }
                        </CardContent>
                    </Card>
                </Reveal>
            </div>

            <AlertDialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setModelToEdit(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit Course Model</AlertDialogTitle>
                        <AlertDialogDescription>Update the name and description for "{modelToEdit?.name}". Configuration mode cannot be changed once created.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <form onSubmit={handleEditModel} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Model Name</Label>
                            <Input id="edit-name" name="name" defaultValue={modelToEdit?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input id="edit-description" name="description" defaultValue={modelToEdit?.description} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Model
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>

        <AlertDialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Deleting "{modelToDelete?.name}" might affect existing fees or schedules using this model. 
                        It is usually safer to just toggle it to "Inactive".
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
