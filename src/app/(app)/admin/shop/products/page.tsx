'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Plus, MoreVertical, Edit, Trash2, Eye, IndianRupee, Search, Filter, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { firestore as db } from '@/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db!, 'shop_products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete ${title}? This action is irreversible.`)) {
      try {
        await deleteDoc(doc(db!, 'shop_products', id));
        toast({
          title: "Module Deleted",
          description: "The product has been removed from your academy collection.",
        });
      } catch (error) {
        toast({
          title: "Deletion Failed",
          description: "There was an error removing the product. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-10">
      {/* Header sections */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
             <Link href="/admin/shop" className="hover:underline">Shop</Link>
             <span>/</span>
             <span className="text-slate-400">Products</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter uppercase leading-none">Product Management</h1>
          <p className="text-slate-500 font-medium">Manage your educational collection and curate curriculum modules.</p>
        </div>
        <Button asChild className="rounded-2xl h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-slate-900/10">
           <Link href="/admin/shop/products/add">
              <Plus className="h-4 w-4" />
              ADD NEW MODULE
           </Link>
        </Button>
      </div>

      {/* Modern Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by title or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 rounded-3xl bg-white border border-slate-100 pl-16 pr-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-600 outline-none placeholder:text-slate-300"
          />
        </div>
        <Button variant="outline" className="h-16 px-8 rounded-3xl border-slate-100 bg-white flex gap-3 text-slate-500 font-black uppercase text-[10px] tracking-widest">
           <Filter className="h-4 w-4" />
           FILTER CATS
        </Button>
      </div>

      {/* Grid of Product Management Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
           <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Synchronizing Catalog...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((p, index) => {
            const courseImage = p.images?.[0] || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800';
            return (
              <Reveal key={p.id} delay={index * 0.05}>
                <div className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-4 transition-all hover:shadow-2xl hover:shadow-black/5 hover:border-black/5 flex flex-col h-full">
                  <div className="relative h-56 w-full rounded-[1.8rem] overflow-hidden mb-6">
                     <Image src={courseImage} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                     <div className="absolute top-4 right-4 z-10 flex gap-2">
                         <div className="bg-white/90 backdrop-blur-md rounded-full p-2 h-10 w-10 flex items-center justify-center text-slate-600 hover:text-primary transition-colors cursor-pointer shadow-xl">
                            <Edit className="h-4 w-4" />
                         </div>
                         <div 
                           onClick={() => handleDelete(p.id, p.title)}
                           className="bg-white/90 backdrop-blur-md rounded-full p-2 h-10 w-10 flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors cursor-pointer shadow-xl"
                         >
                            <Trash2 className="h-4 w-4" />
                         </div>
                     </div>
                  </div>

                  <div className="px-3 flex-grow space-y-4">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-slate-100 text-slate-400 py-1 px-3 mb-2">
                              {p.modules?.length || 0} Modules
                           </Badge>
                           <Badge className="bg-green-50 text-green-600 border-none text-[8px] font-black uppercase tracking-[0.2em] py-1 px-3 mb-2 uppercase">
                              {p.status || 'ACTIVE'}
                           </Badge>
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase leading-tight pr-8">{p.title}</h3>
                     </div>
                     <p className="text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between px-3">
                     <div className="flex items-center font-black text-xl text-slate-900 leading-none">
                        <IndianRupee className="h-3 w-3" strokeWidth={3} />
                        {p.price}
                     </div>
                     <Button asChild variant="ghost" className="rounded-full h-10 px-6 text-primary font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-primary/5">
                        <Link href={`/products/${p.id}`}>
                           <Eye className="h-3 w-3" />
                           Preview
                        </Link>
                     </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}

          {/* Empty add card */}
          <Reveal delay={filteredProducts.length * 0.05}>
             <Link href="/admin/shop/products/add" className="group rounded-[2.5rem] border-2 border-dashed border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-6 min-h-[400px] hover:border-primary/20 hover:bg-slate-50/50 transition-all">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                   <Plus className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-black uppercase text-slate-400 group-hover:text-slate-600">Add New Module</h3>
                   <p className="text-xs text-slate-300 font-medium max-w-xs">Introduce a new masterpiece to your curriculum and expand your academy's reach.</p>
                </div>
             </Link>
          </Reveal>
        </div>
      )}
    </div>
  );
}
