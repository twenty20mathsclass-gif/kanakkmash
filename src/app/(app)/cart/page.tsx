import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, PlayCircle, Star } from 'lucide-react';
import { courses } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

const recommendedCourses = courses.slice(0, 2);

export default function CartPage() {

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
                        <Receipt className="mr-2 h-4 w-4" />
                        Payment History
                    </Link>
                </Button>
            </div>
        </Reveal>

        {/* Empty cart UI, inspired by the user's image */}
        <div className="space-y-10">
            <Reveal delay={0.1}>
                 <Card className="bg-primary/10 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-headline text-2xl font-bold text-primary">50% OFF</h3>
                            <p className="text-muted-foreground">On over 246+ Courses</p>
                            <Button asChild variant="link" className="p-0 h-auto text-primary font-bold">
                                <Link href="/courses">Enroll Now</Link>
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
            </Reveal>

            <div className="space-y-4">
                <Reveal delay={0.2}>
                    <h2 className="text-2xl font-bold font-headline">Categories</h2>
                </Reveal>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Reveal delay={0.3}>
                        <Card className="bg-accent/10 border-accent/20 h-full">
                            <CardContent className="p-6 space-y-2 flex flex-col justify-between h-full">
                                <div>
                                     <h3 className="font-headline text-xl font-bold">Geometry</h3>
                                     <p className="text-sm text-muted-foreground">16 Courses</p>
                                </div>
                                 <div className="h-24 w-full mt-2 flex justify-end items-end">
                                    <Image src="https://picsum.photos/seed/drawing-illustration/120/90" alt="Geometry illustration" width={120} height={90} className="object-contain" data-ai-hint="geometry shapes illustration" />
                                 </div>
                            </CardContent>
                        </Card>
                    </Reveal>
                     <Reveal delay={0.4}>
                        <Card className="bg-secondary h-full">
                            <CardContent className="p-6 space-y-2 flex flex-col justify-between h-full">
                                <div>
                                     <h3 className="font-headline text-xl font-bold">Calculus</h3>
                                     <p className="text-sm text-muted-foreground">25 Courses</p>
                                </div>
                                  <div className="h-24 w-full mt-2 flex justify-end items-end">
                                    <Image src="https://picsum.photos/seed/uiux-illustration/120/90" alt="Calculus illustration" width={120} height={90} className="object-contain" data-ai-hint="calculus graph illustration" />
                                  </div>
                            </CardContent>
                        </Card>
                    </Reveal>
                </div>
            </div>

            <div className="space-y-4">
                <Reveal delay={0.5}>
                    <h2 className="text-2xl font-bold font-headline">Popular Courses</h2>
                </Reveal>
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
                                        <p className="font-bold text-lg text-primary">$26.99</p>
                                        <Button size="sm" className="mt-1">Add to Cart</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Reveal>
                    )})}
                </div>
            </div>
        </div>
    </div>
  );
}
