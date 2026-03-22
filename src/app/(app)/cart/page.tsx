'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, PlayCircle, Star, Loader2 } from 'lucide-react';
import { courses } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Reveal } from '@/components/shared/reveal';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { CartOffer, CourseCategory, PopularCourse } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function CartPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const [offer, setOffer] = useState<CartOffer | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setLoading(false);
      return;
    };
    const unsubscribes: (()=>void)[] = [];

    const offerRef = doc(firestore, 'cartContent', 'mainOffer');
    unsubscribes.push(onSnapshot(offerRef, (docSnap) => {
      if (docSnap.exists()) {
        setOffer(docSnap.data() as CartOffer);
      }
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: offerRef.path, operation: 'get' }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.warn("Firestore error getting cart offer:", serverError);
        }
    }));

    const categoriesCol = collection(firestore, 'courseCategories');
    unsubscribes.push(onSnapshot(categoriesCol, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
      setCategories(cats);
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: categoriesCol.path, operation: 'list' }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.warn("Firestore error getting categories:", serverError);
        }
    }));

    const popularCol = collection(firestore, 'popularCourses');
    unsubscribes.push(onSnapshot(popularCol, (snapshot) => {
      const popCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PopularCourse));
      setPopularCourses(popCourses);
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: popularCol.path, operation: 'list' }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.warn("Firestore error getting popular courses:", serverError);
        }
    }));
    
    // a small delay to ensure all data is loaded before hiding loader
    setTimeout(() => setLoading(false), 1000);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [firestore]);


  const handleAddToCart = (courseTitle: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      router.push('/sign-in');
    } else {
      toast({
        title: 'Success!',
        description: `${courseTitle} has been added to your cart.`,
      });
    }
  };

  const recommendedCourses = courses.filter(c => popularCourses.some(p => p.courseId === c.id));
  const categoryStyleClasses = {
    primary: 'bg-primary/10 border-primary/20',
    secondary: 'bg-secondary',
    accent: 'bg-accent/10 border-accent/20',
  }

  return (
    <div className="space-y-8">
        <Reveal>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Course Cart</h1>
                    <p className="text-muted-foreground">Your shopping cart is empty. Let's find a course for you!</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/purchased-courses">
                        <IndianRupee className="mr-2 h-4 w-4" />
                        Payment History
                    </Link>
                </Button>
            </div>
        </Reveal>
        
        {loading ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
        <div className="space-y-10">
            <Reveal delay={0.1}>
                {offer ? (
                 <Card className="bg-primary/10 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-headline text-2xl font-bold text-primary">{offer.title}</h3>
                            <p className="text-muted-foreground">{offer.description}</p>
                            <Button asChild variant="link" className="p-0 h-auto text-primary font-bold">
                                <Link href={offer.buttonLink}>{offer.buttonText}</Link>
                            </Button>
                        </div>
                        <div className="relative hidden sm:block">
                            <Image 
                                src="https://picsum.photos/seed/sale-woman/120/120"
                                width={100}
                                height={100}
                                alt="Special Offer"
                                className="rounded-lg object-cover shadow-lg"
                                data-ai-hint="surprised woman"
                            />
                             <Button variant="secondary" size="icon" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 shadow-lg border">
                                <PlayCircle className="h-5 w-5 text-primary" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                ) : (
                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>Offers will be displayed here.</p>
                    </div>
                )}
            </Reveal>

            <div className="space-y-4">
                <Reveal delay={0.2}>
                    <h2 className="text-2xl font-bold font-headline">Categories</h2>
                </Reveal>
                {categories.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {categories.map((category, index) => (
                        <Reveal delay={0.3 + index * 0.1} key={category.id}>
                            <Card className={cn("h-full", categoryStyleClasses[category.style] || "bg-secondary")}>
                                <CardContent className="p-6 space-y-2 flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="font-headline text-xl font-bold">{category.name}</h3>
                                        <p className="text-sm text-muted-foreground">{category.courseCount} Courses</p>
                                    </div>
                                    <div className="h-24 w-full mt-2 flex justify-end items-end">
                                        <Image src={category.imageUrl} alt={`${category.name} illustration`} width={120} height={90} className="object-contain" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Reveal>
                        ))}
                    </div>
                ) : <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg"><p>Categories will be displayed here.</p></div>}
            </div>

            <div className="space-y-4">
                <Reveal delay={0.5}>
                    <h2 className="text-2xl font-bold font-headline">Popular Courses</h2>
                </Reveal>
                {recommendedCourses.length > 0 ? (
                    <div className="space-y-4">
                        {recommendedCourses.map((course, index) => {
                            const courseImage = PlaceHolderImages.find(img => img.id === course.imageId);
                            return (
                            <Reveal delay={0.6 + index * 0.1} key={course.id}>
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardContent className="p-3 sm:p-4 flex gap-4 items-center">
                                        {courseImage && 
                                            <Image
                                                src={courseImage.imageUrl}
                                                alt={course.title}
                                                width={80}
                                                height={80}
                                                className="rounded-lg object-cover aspect-square"
                                                data-ai-hint={courseImage.imageHint}
                                            />
                                        }
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-semibold sm:font-bold">{course.title}</h3>
                                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <p>{course.modules.flatMap(m => m.lessons).length * 4} lessons</p>
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 text-primary fill-primary"/>
                                                    <span>4.9</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-primary flex items-center justify-end gap-0.5">
                                                <IndianRupee className="h-4 w-4" /> 2,250
                                            </p>
                                            <Button size="sm" className="mt-1" onClick={() => handleAddToCart(course.title)}>Add to Cart</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        )})}
                    </div>
                ): <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg"><p>Popular courses will be displayed here.</p></div>}
            </div>
        </div>
        )}
    </div>
  );
}
