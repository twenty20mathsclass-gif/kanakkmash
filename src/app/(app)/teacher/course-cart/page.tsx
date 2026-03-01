
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CourseCategory } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


function ManageCategories({ firestore }: { firestore: Firestore }) {
    const { toast } = useToast();
    const [categories, setCategories] = useState<CourseCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const categoriesCol = collection(firestore, 'courseCategories');
        const unsubscribe = onSnapshot(categoriesCol, (snapshot) => {
          const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
          setCategories(cats);
          setLoadingCategories(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: categoriesCol.path, operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("Firestore error getting categories:", serverError);
            }
            setLoadingCategories(false);
        });
        return () => unsubscribe();
      }, [firestore]);
    
    const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;
        const form = e.currentTarget;
        const formData = new FormData(form);
        const newCategoryData = {
            name: formData.get('name') as string,
            courseCount: formData.get('courseCount') as string,
            imageUrl: formData.get('imageUrl') as string,
            style: formData.get('style') as 'primary' | 'secondary' | 'accent',
        };
        
        const categoriesCol = collection(firestore, 'courseCategories');
        addDoc(categoriesCol, newCategoryData).then(() => {
            toast({ title: "Success", description: "Category added." });
            form.reset();
        }).catch((serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: categoriesCol.path, operation: 'create', requestResourceData: newCategoryData }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: "Permission Denied", description: "You don't have permission to add a category." });
            } else {
                console.error(serverError);
                toast({ variant: 'destructive', title: "Error", description: "Failed to add category." });
            }
        });
    };
    
    const handleDeleteCategory = (id: string) => {
        if (!firestore) return;
        const categoryRef = doc(firestore, 'courseCategories', id);
        deleteDoc(categoryRef).then(() => {
            toast({ title: "Success", description: "Category deleted." });
        }).catch((serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: categoryRef.path, operation: 'delete' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: "Permission Denied", description: "You don't have permission to delete this category." });
            } else {
                console.error(serverError);
                toast({ variant: 'destructive', title: "Error", description: "Failed to delete category." });
            }
        });
    };

    return (
        <Card>
            <CardHeader><CardTitle>Categories Section</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Current Categories</h3>
                    {loadingCategories ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <span>{cat.name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                            {categories.length === 0 && <p className="text-muted-foreground text-sm">No categories yet.</p>}
                        </div>
                    )}
                </div>
                <form onSubmit={handleAddCategory} className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold">Add New Category</h3>
                    <div><Label htmlFor="catName">Name</Label><Input id="catName" name="name" required /></div>
                    <div><Label htmlFor="catCount">Course Count</Label><Input id="catCount" name="courseCount" required /></div>
                    <div><Label htmlFor="catImg">Image URL</Label><Input id="catImg" name="imageUrl" placeholder="https://picsum.photos/seed/..." required /></div>
                    <div>
                        <Label htmlFor="catStyle">Style</Label>
                        <Select name="style" required defaultValue="secondary">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="secondary">Secondary</SelectItem>
                                <SelectItem value="accent">Accent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit">Add Category</Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function TeacherCourseCartPage() {
    const { firestore } = useFirebase();

    if (!firestore) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Course Category Management</h1>
                    <p className="text-muted-foreground">Manage course categories for the student's cart page.</p>
                </div>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Course Category Management</h1>
            <p className="text-muted-foreground">Manage course categories for the student's cart page.</p>
        </div>

        <ManageCategories firestore={firestore} />
    </div>
  );
}
