'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, PlayCircle, Star, Loader2, Search, Filter, SlidersHorizontal, ShoppingCart, ArrowRight, Zap, Trophy, Flame, Play, History } from 'lucide-react';
import { courses } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Reveal } from '@/components/shared/reveal';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { CartOffer, CourseCategory } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ShopPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const [offer, setOffer] = useState<CartOffer | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceSort, setPriceSort] = useState('relevant');

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
    }, (error) => console.warn("Firestore error getting cart offer:", error)));

    const categoriesCol = collection(firestore, 'courseCategories');
    unsubscribes.push(onSnapshot(categoriesCol, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
      setCategories(cats);
    }, (error) => console.warn("Firestore error getting categories:", error)));

    const productsCol = collection(firestore, 'shop_products');
    unsubscribes.push(onSnapshot(productsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error getting products:", error);
      setLoading(false);
    }));

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

  // Filter logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-16 pb-20 overflow-x-hidden">
      {/* 1. Introduction Section: High-End Hero */}
      <Reveal>
        <div className="relative h-[20rem] sm:h-[25rem] md:h-[30rem] rounded-[2rem] sm:rounded-[3rem] overflow-hidden group">
          <Image 
            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000"
            alt="Ecommerce Introduction"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center px-6 sm:px-12">
            <div className="max-w-2xl space-y-4 sm:space-y-6">
              <h1 className="text-white text-3xl sm:text-5xl md:text-7xl font-black font-headline leading-[0.9] tracking-tighter">
                ELEVATE YOUR <br />
                ACADEMIC REACH.
              </h1>
              <p className="text-white/70 text-sm sm:text-lg md:text-xl font-medium leading-relaxed max-w-sm sm:max-w-lg">
                Explore our curated selection of world-class mathematics courses. From foundational principles to competitive excellence.
              </p>
              <div className="flex gap-4 pt-2 sm:pt-4">
                <Button size="lg" className="rounded-full px-6 sm:px-10 h-11 sm:h-14 bg-white text-black hover:bg-slate-100 font-black gap-2 group/btn shadow-xl shadow-white/10 text-xs sm:text-base">
                  EXPLORE NOW
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="space-y-12">
        {/* 3. Product Listing Grid */}
        <section className="space-y-8">
          <Reveal>
            <div className="flex items-end justify-between px-4">
              <div>
                <h2 className="text-4xl font-black font-headline tracking-tighter uppercase">OUR COLLECTION</h2>
                <p className="text-slate-400 font-medium">Discover elite modules designed for engineering excellence.</p>
              </div>
            </div>
          </Reveal>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-[450px] rounded-[3rem] bg-slate-100 animate-pulse border border-slate-200" />
                ))}
             </div>
          ) : filteredProducts.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
                {filteredProducts.slice(0, 8).map((p, index) => {
                  const courseImage = p.images?.[0] || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800';
                  return (
                    <Reveal key={p.id} delay={index * 0.05}>
                      <Link href={`/products/${p.id}`} className="block h-full group">
                        <div className="relative bg-white rounded-[3rem] border border-black/5 p-4 transition-all duration-500 group-hover:shadow-2xl h-full flex flex-col group-hover:-translate-y-2">
                          <div className="relative h-64 w-full rounded-[2.5rem] overflow-hidden mb-6">
                            <Image src={courseImage} alt={p.title} fill className="object-cover" />
                          </div>
                          <div className="px-3 flex-grow space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">MATHEMATICS</p>
                              <h3 className="text-2xl font-black font-headline leading-tight pr-4">{p.title}</h3>
                            </div>
                            <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">{p.description}</p>
                          </div>
                          <div className="mt-6 flex items-center justify-between px-3">
                            <div className="flex items-center font-black text-2xl text-slate-900 leading-none">
                              <IndianRupee className="h-4 w-4" strokeWidth={3} />
                              {p.price}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>

              <Reveal delay={0.3}>
                <div className="flex justify-center pt-8">
                  <Button asChild size="lg" className="h-16 px-12 rounded-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/10 hover:bg-slate-800 transition-all gap-4 group">
                    <Link href="/products">
                      VIEW ALL COLLECTION
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-32 text-center space-y-6">
              <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center animate-pulse">
                <Search className="h-10 w-10 text-slate-200" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 italic">No blueprints found...</h3>
                <p className="text-slate-400 font-medium">Reset your filters to discover other elite modules.</p>
              </div>
              <Button 
                variant="outline" 
                className="rounded-full px-8 h-12 border-primary/20 text-primary font-bold hover:bg-primary/5"
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </section>

        {/* 4. Secondary Offer / Upsell */}
        {offer && (
           <Reveal>
             <div className="bg-slate-900 rounded-[4rem] p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-full w-1/2 bg-primary/20 blur-[120px] opacity-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                   <div className="max-w-xl space-y-6">
                      <h3 className="text-white text-4xl md:text-5xl font-black font-headline leading-[0.9]">{offer.title}</h3>
                      <p className="text-white/60 text-lg leading-relaxed">{offer.description}</p>
                      <Button size="lg" className="rounded-full px-10 h-14 bg-primary text-white hover:bg-primary/90 font-black gap-2 shadow-2xl shadow-primary/20">
                         {offer.buttonText}
                         <ArrowRight className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="relative h-64 w-64 md:h-80 md:w-80">
                      <Image 
                        src="https://images.unsplash.com/photo-1523240715632-603126be8dc0?auto=format&fit=crop&q=80&w=800"
                        alt="Join Academy"
                        fill
                        className="rounded-3xl object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                      />
                   </div>
                </div>
             </div>
           </Reveal>
        )}
      </div>
    </div>
  );
}

