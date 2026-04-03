'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, PlayCircle, Star, Loader2, Search, Filter, SlidersHorizontal, ShoppingCart, ArrowRight, Zap, Trophy, Flame, Play, History, MoveLeft } from 'lucide-react';
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

export default function ProductsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceSort, setPriceSort] = useState('relevant');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!firestore) {
      setLoading(false);
      return;
    };
    
    const categoriesCol = collection(firestore, 'courseCategories');
    const unsubCategories = onSnapshot(categoriesCol, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
      setCategories(cats);
    }, (error) => console.warn("Firestore error:", error));

    const productsCol = collection(firestore, 'shop_products');
    const unsubProducts = onSnapshot(productsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error:", error);
      setLoading(false);
    });

    return () => {
      unsubCategories();
      unsubProducts();
    };
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 pb-20 mt-12">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase">ALL PRODUCTS</h1>
            <p className="text-slate-400 font-medium">Explore our complete world-class curriculum of {courses.length} modules.</p>
          </div>
        </div>
      </Reveal>

      {/* Search & Filter */}
      <Reveal>
        <div className="sticky top-24 z-40 bg-white/80 backdrop-blur-2xl border border-black/5 p-4 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-black/5 mx-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
            {/* Search Input with Filter Icon on Left */}
            <div className="md:col-span-6 relative">
              <Filter className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input 
                placeholder="Search premium courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 pl-14 rounded-2xl border-none bg-slate-100/50 hover:bg-slate-100 transition-all font-bold text-slate-800 placeholder:text-slate-400"
              />
            </div>
            
            {/* Compact selectors for mobile */}
            <div className="flex gap-3 md:col-span-6">
              <div className="flex-1">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-none bg-slate-100/50 hover:bg-slate-100 transition-all font-bold text-xs sm:text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-3xl">
                    <SelectItem value="all" className="font-bold">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name} className="font-bold">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={priceSort} onValueChange={setPriceSort}>
                  <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-none bg-slate-100/50 hover:bg-slate-100 transition-all font-bold text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                       <SlidersHorizontal className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                       <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-3xl">
                    <SelectItem value="relevant" className="font-bold">Relevance</SelectItem>
                    <SelectItem value="low" className="font-bold">Price: Low to High</SelectItem>
                    <SelectItem value="high" className="font-bold">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
        {loading ? (
             [1,2,3,4].map(i => (
               <div key={i} className="h-[450px] rounded-[3rem] bg-slate-100 animate-pulse" />
             ))
        ) : filteredProducts.map((p, index) => {
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
                      <h3 className="text-2xl font-black font-headline leading-tight pr-4 group-hover:text-primary transition-colors">{p.title}</h3>
                    </div>
                    <p className="text-slate-500 text-sm font-medium line-clamp-2">{p.description}</p>
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
    </div>
  );
}
