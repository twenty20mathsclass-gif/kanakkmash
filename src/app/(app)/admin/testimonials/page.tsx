'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Trash2, Video, Link as LinkIcon, Upload, X, PenBox } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Testimonial } from '@/lib/definitions';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
import { uploadImage } from '@/lib/actions';


function TestimonialForm({ firestore, onSaved, initialData }: { firestore: Firestore, onSaved: () => void, initialData?: Testimonial }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;

        setLoading(true);
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        const studentName = formData.get('studentName') as string;
        const quote = formData.get('quote') as string;
        const videoUrl = formData.get('videoUrl') as string || null;
        const link = formData.get('link') as string || null;

        if (!studentName || !quote || (!imageFile && !initialData)) {
            setError("Student Name, Quote, and an Image are required.");
            setLoading(false);
            return;
        }

        try {
            let imageUrl = initialData?.imageUrl || '';
            if (imageFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);
                imageUrl = await uploadImage(uploadFormData);
            }
            
            const dataToSave: any = {
                studentName,
                quote,
                videoUrl,
                link,
                imageUrl,
            };

            if (initialData) {
                const testimonialRef = doc(firestore, 'testimonials', initialData.id);
                await updateDoc(testimonialRef, dataToSave);
                toast({ title: "Success", description: "Testimonial updated." });
            } else {
                dataToSave.createdAt = serverTimestamp();
                await addDoc(collection(firestore, 'testimonials'), dataToSave);
                toast({ title: "Success", description: "Testimonial added." });
            }
            
            form.reset();
            setImageFile(null);
            if (!initialData) setImagePreview(null);
            onSaved();

        } catch (serverError: any) {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'testimonials', operation: initialData ? 'update' : 'create' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setError('Failed to save testimonial due to permissions.');
            } else {
                 console.warn("Unexpected error:", serverError);
                 setError(serverError.message || 'An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" name="studentName" required defaultValue={initialData?.studentName} />
            </div>
            <div>
                <Label htmlFor="quote">Quote</Label>
                <Textarea id="quote" name="quote" required placeholder="Write the testimonial here..." defaultValue={initialData?.quote} />
            </div>
             <div>
                <Label htmlFor="image">Student Image</Label>
                <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} required={!initialData} className="file:text-foreground"/>
                {imagePreview && (
                    <div className="mt-4 relative w-32 h-32">
                        <Image src={imagePreview} alt="Image preview" fill className="rounded-md object-cover" />
                         <Button
                            type="button" variant="destructive" size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <Label htmlFor="videoUrl">Video URL (Optional)</Label>
             <div className="flex items-center gap-2">
                    <Video className="text-muted-foreground" />
                    <Input id="videoUrl" name="videoUrl" placeholder="https://youtube.com/watch?v=..." defaultValue={initialData?.videoUrl || ''} />
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="link">Profile/Project Link (Optional)</Label>
                 <div className="flex items-center gap-2">
                    <LinkIcon className="text-muted-foreground" />
                    <Input id="link" name="link" placeholder="https://github.com/student" defaultValue={initialData?.link || ''} />
                </div>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : (initialData ? 'Save Changes' : 'Add Testimonial')}
                </Button>
            </DialogFooter>
        </form>
    );
}


export default function AdminTestimonialsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [testimonialToEdit, setTestimonialToEdit] = useState<Testimonial | null>(null);
    const [testimonialToDelete, setTestimonialToDelete] = useState<Testimonial | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);

        const testimonialsQuery = query(collection(firestore, 'testimonials'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(testimonialsQuery, (snapshot) => {
            const fetchedTestimonials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
            setTestimonials(fetchedTestimonials);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'testimonials', operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error fetching testimonials:", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    const handleDelete = async () => {
        if (!firestore || !testimonialToDelete) return;
        setIsDeleting(true);

        try {
            // Delete firestore doc
            const testimonialRef = doc(firestore, 'testimonials', testimonialToDelete.id);
            await deleteDoc(testimonialRef);
            
            toast({ title: "Success", description: "Testimonial deleted." });
        } catch (serverError: any) {
             if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `testimonials/${testimonialToDelete.id}`, operation: 'delete' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: "Permission Denied", description: "You don't have permission to delete testimonials." });
            } else {
                console.warn("Firestore error:", serverError);
                toast({ variant: 'destructive', title: "Error", description: "Failed to delete testimonial." });
            }
        } finally {
            setIsDeleting(false);
            setTestimonialToDelete(null);
        }
    };

    if (!firestore) {
        return (
             <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Testimonials</h1>
                    <p className="text-muted-foreground">Add, edit, and manage student testimonials.</p>
                </div>
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            </div>
        )
    }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Testimonials</h1>
                <p className="text-muted-foreground">Add, edit, and manage student testimonials.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2"/>Add Testimonial</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add a New Testimonial</DialogTitle>
                    </DialogHeader>
                    <TestimonialForm firestore={firestore} onSaved={() => setIsDialogOpen(false)}/>
                </DialogContent>
            </Dialog>

            <Dialog open={!!testimonialToEdit} onOpenChange={(v) => !v && setTestimonialToEdit(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Testimonial</DialogTitle>
                    </DialogHeader>
                    {testimonialToEdit && <TestimonialForm firestore={firestore} initialData={testimonialToEdit} onSaved={() => setTestimonialToEdit(null)}/>}
                </DialogContent>
            </Dialog>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Current Testimonials</CardTitle>
                <CardDescription>A list of all testimonials currently displayed on the website.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
                testimonials.length > 0 ? (
                    <div className="space-y-4">
                        {testimonials.map(t => (
                            <div key={t.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="relative w-20 h-20 shrink-0">
                                    <Image src={t.imageUrl} alt={t.studentName} fill className="rounded-md object-cover aspect-square" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="font-bold">{t.studentName}</p>
                                    <p className="text-sm text-muted-foreground italic line-clamp-2">"{t.quote}"</p>
                                    <div className="flex gap-4 text-sm pt-1">
                                        {t.videoUrl && <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><Video className="h-4 w-4"/> Video</a>}
                                        {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><LinkIcon className="h-4 w-4"/> Link</a>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={() => setTestimonialToEdit(t)}>
                                        <PenBox className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setTestimonialToDelete(t)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No testimonials yet.</p>
                        <p>Click "Add Testimonial" to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <AlertDialog open={!!testimonialToDelete} onOpenChange={(open) => !open && setTestimonialToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the testimonial from {testimonialToDelete?.studentName}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}