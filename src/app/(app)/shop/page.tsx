'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, PlayCircle, Star, Loader2, Search, Filter, SlidersHorizontal, ShoppingCart, ArrowRight, Zap, Trophy, Flame, Play, History, ArrowLeft } from 'lucide-react';
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
  const { addToCart } = useCart();

  const [offer, setOffer] = useState<CartOffer | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([
    { id: 'books', name: 'Books' } as CourseCategory,
    { id: 'courses', name: 'Courses' } as CourseCategory,
    { id: 'materials', name: 'Materials' } as CourseCategory,
    { id: 'maths-products', name: 'Maths Products' } as CourseCategory
  ]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceSort, setPriceSort] = useState('relevant');
  const [visibleCount, setVisibleCount] = useState(8);

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

  const handleAddToCart = (product: any) => {
    addToCart(product);
    toast({
      title: 'Added to Cart',
      description: `${product.title} has been added to your cart.`,
    });
  };

  // Filter logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-16 pb-20 overflow-x-hidden pt-8">
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
            <div className="flex flex-col lg:flex-row lg:items-end justify-between px-4 gap-6">
              <div>
                <h2 className="text-4xl font-black font-headline tracking-tighter uppercase">OUR COLLECTION</h2>
                <p className="text-slate-400 font-medium">Discover elite modules designed for engineering excellence.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <Input 
                      placeholder="Search courses..." 
                      className="pl-12 rounded-full border-none bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/20 h-12 w-full font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[180px] rounded-full border-none bg-slate-100 h-12 px-5 font-bold flex gap-2 text-slate-700">
                        <Filter size={16} className="text-slate-400" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="all" className="font-semibold">All Categories</SelectItem>
                        {categories.map(c => (
                            <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8 px-4 pb-8 md:pb-0 scrollbar-hide items-stretch">
                {filteredProducts.slice(0, visibleCount).map((p, index) => {
                  const courseImage = p.images?.[0] || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800';
                  return (
                    <div key={p.id} className="w-[260px] shrink-0 snap-start md:w-auto md:min-w-0 md:snap-align-none h-full">
                      <Reveal delay={index * 0.05} className="h-full">
                        <Link href={`/products/${p.id}`} className="block h-full group">
                          <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] border border-black/5 p-3 md:p-4 transition-all duration-500 group-hover:shadow-2xl h-full flex flex-col group-hover:-translate-y-2">
                            <div className="relative h-48 md:h-64 w-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden mb-4 md:mb-6">
                              <Image src={courseImage} alt={p.title} fill className="object-cover" />
                            </div>
                            <div className="px-2 md:px-3 flex-grow space-y-2 md:space-y-4">
                              <div className="space-y-1">
                                <p className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em]">MATHEMATICS</p>
                                <h3 className="text-lg md:text-2xl font-black font-headline leading-tight pr-2 md:pr-4">{p.title}</h3>
                              </div>
                              <p className="text-slate-500 text-xs md:text-sm font-medium line-clamp-2 md:line-clamp-3 leading-relaxed">{p.description}</p>
                            </div>
                            <div className="mt-4 md:mt-6 flex items-center justify-between px-2 md:px-3">
                              <div className="flex items-center font-black text-xl md:text-2xl text-slate-900 leading-none">
                                <IndianRupee className="h-3 w-3 md:h-4 md:w-4" strokeWidth={3} />
                                {p.price}
                              </div>
                              <Button 
                                size="sm" 
                                className="rounded-full bg-slate-900 hover:bg-primary text-white font-bold shadow-md hover:shadow-xl transition-all h-9 px-4 gap-1.5 z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAddToCart(p);
                                }}
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </Link>
                      </Reveal>
                    </div>
                  );
                })}
              </div>

              {visibleCount < filteredProducts.length && (
                <Reveal delay={0.3}>
                  <div className="flex justify-center pt-8">
                    <Button 
                      size="lg" 
                      onClick={() => setVisibleCount(prev => prev + 8)}
                      className="h-16 px-12 rounded-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/10 hover:bg-slate-800 transition-all gap-4 group"
                    >
                      LOAD MORE MODULES
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </Reveal>
              )}
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
             <div className="relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden">
               {/* Background Image */}
               <div className="absolute inset-0">
                 <Image 
                   src="https://images.unsplash.com/photo-1523240715632-603126be8dc0?auto=format&fit=crop&q=80&w=1600"
                   alt=""
                   fill
                   className="object-cover"
                 />
                 {/* Strong dark overlay for readability */}
                 <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-900/50" />
                 {/* Accent glow */}
                 <div className="absolute bottom-0 left-0 h-40 w-80 bg-primary/30 blur-[80px] pointer-events-none" />
               </div>

               {/* Content */}
               <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 p-8 sm:p-12 md:p-16">
                 <div className="max-w-xl space-y-4 sm:space-y-6">
                   <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm">
                     🔥 Limited Time Offer
                   </div>
                   <h3 className="text-white text-3xl sm:text-4xl md:text-5xl font-black font-headline leading-tight">{offer.title}</h3>
                   <p className="text-white/70 text-sm sm:text-base md:text-lg leading-relaxed">{offer.description}</p>
                   <Button 
                     size="lg" 
                     className="rounded-full px-8 sm:px-10 h-12 sm:h-14 bg-primary text-white hover:bg-primary/90 font-black gap-2 shadow-2xl shadow-primary/30 text-sm sm:text-base"
                   >
                     {offer.buttonText}
                     <ArrowRight className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             </div>
           </Reveal>
        )}
      </div>
    </div>
  );
}

