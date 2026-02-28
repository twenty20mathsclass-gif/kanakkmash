
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { courses } from '@/lib/data';
import type { CartOffer, CourseCategory, PopularCourse } from '@/lib/definitions';

function ManageOffers({ firestore }: { firestore: Firestore }) {
    const { toast } = useToast();
    const [offer, setOffer] = useState<CartOffer | null>(null);
    const [loadingOffer, setLoadingOffer] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const offerRef = doc(firestore, 'cartContent', 'mainOffer');
        const unsubscribe = onSnapshot(offerRef, (docSnap) => {
          if (docSnap.exists()) {
            setOffer(docSnap.data() as CartOffer);
          } else {
            setOffer({ title: '50% OFF', description: 'On over 246+ Courses', buttonText: 'Enroll Now', buttonLink: '/dashboard' });
          }
          setLoadingOffer(false);
        });
        return () => unsubscribe();
      }, [firestore]);
    
    const handleOfferSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !offer) return;
        try {
          await setDoc(doc(firestore, 'cartContent', 'mainOffer'), offer);
          toast({ title: "Success", description: "Offer updated successfully." });
        } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: "Error", description: "Failed to update offer." });
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Offers Section</CardTitle></CardHeader>
            <CardContent>
                {loadingOffer ? <Loader2 className="animate-spin" /> : offer && (
                    <form onSubmit={handleOfferSave} className="space-y-4">
                        <div><Label htmlFor="offerTitle">Title</Label><Input id="offerTitle" value={offer.title} onChange={(e) => setOffer({...offer, title: e.target.value})} /></div>
                        <div><Label htmlFor="offerDesc">Description</Label><Input id="offerDesc" value={offer.description} onChange={(e) => setOffer({...offer, description: e.target.value})} /></div>
                        <div><Label htmlFor="offerBtnText">Button Text</Label><Input id="offerBtnText" value={offer.buttonText} onChange={(e) => setOffer({...offer, buttonText: e.target.value})} /></div>
                        <div><Label htmlFor="offerBtnLink">Button Link</Label><Input id="offerBtnLink" value={offer.buttonLink} onChange={(e) => setOffer({...offer, buttonLink: e.target.value})} /></div>
                        <Button type="submit">Save Offer</Button>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

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
        });
        return () => unsubscribe();
      }, [firestore]);
    
    const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
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
        try {
            await addDoc(collection(firestore, 'courseCategories'), newCategoryData);
            toast({ title: "Success", description: "Category added." });
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to add category." });
        }
    };
    
    const handleDeleteCategory = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'courseCategories', id));
            toast({ title: "Success", description: "Category deleted." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete category." });
        }
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

function ManagePopularCourses({ firestore }: { firestore: Firestore }) {
    const { toast } = useToast();
    const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
    const [loadingPopular, setLoadingPopular] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const popularCol = collection(firestore, 'popularCourses');
        const unsubscribe = onSnapshot(popularCol, (snapshot) => {
          const popCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PopularCourse));
          setPopularCourses(popCourses);
          setLoadingPopular(false);
        });
        return () => unsubscribe();
      }, [firestore]);

    const handleAddPopularCourse = async (courseId: string) => {
        if (!firestore || !courseId) return;
        if (popularCourses.some(p => p.courseId === courseId)) {
            toast({ variant: 'destructive', title: "Error", description: "Course is already popular." });
            return;
        }
        try {
            await addDoc(collection(firestore, 'popularCourses'), { courseId });
            toast({ title: "Success", description: "Popular course added." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to add popular course." });
        }
    };
    const handleDeletePopularCourse = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'popularCourses', id));
            toast({ title: "Success", description: "Popular course removed." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to remove popular course." });
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Popular Courses Section</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Current Popular Courses</h3>
                    {loadingPopular ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-2">
                            {popularCourses.map(pc => {
                                const course = courses.find(c => c.id === pc.courseId);
                                return (
                                    <div key={pc.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <span>{course?.title || 'Unknown Course'}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePopularCourse(pc.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                )
                            })}
                            {popularCourses.length === 0 && <p className="text-muted-foreground text-sm">No popular courses selected.</p>}
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <h3 className="font-semibold">Add Popular Course</h3>
                    <Select onValueChange={handleAddPopularCourse}>
                        <SelectTrigger><SelectValue placeholder="Select a course to add" /></SelectTrigger>
                        <SelectContent>
                            {courses.map(course => (
                                <SelectItem key={course.id} value={course.id} disabled={popularCourses.some(p => p.courseId === course.id)}>{course.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminCourseCartPage() {
  const { firestore } = useFirebase();

  if (!firestore) {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Course Cart Management</h1>
                <p className="text-muted-foreground">Manage the content displayed on the student's course cart page.</p>
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
            <h1 className="text-3xl font-bold font-headline">Course Cart Management</h1>
            <p className="text-muted-foreground">Manage the content displayed on the student's course cart page.</p>
        </div>

        <div className="space-y-8">
            <ManageOffers firestore={firestore} />
            <ManageCategories firestore={firestore} />
            <ManagePopularCourses firestore={firestore} />
        </div>
    </div>
  );
}
