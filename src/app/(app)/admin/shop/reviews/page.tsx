'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { MessageSquareQuote, MoveLeft, Star, Trash2, Loader2, AlertCircle, Plus, X, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { firestore as db } from '@/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function AdminReviewsDashboard() {
  const [loading, setLoading] = useState(true);
  const [productsWithReviews, setProductsWithReviews] = useState<any[]>([]);
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ name: '', text: '', rating: 5, phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db) return;

    const fetchAllReviews = async () => {
      try {
        // 1. Fetch all products
        const productsSnap = await getDocs(collection(db, 'shop_products'));
        const productsList = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const aggregated: any[] = [];

        // 2. Fetch reviews for each product
        for (const product of productsList) {
          const reviewsSnap = await getDocs(
            query(collection(db, `shop_products/${product.id}/reviews`), orderBy('createdAt', 'desc'))
          );
          
          const reviews = reviewsSnap.empty ? [] : reviewsSnap.docs.map(r => ({
            id: r.id,
            ...r.data(),
            createdAt: r.data().createdAt?.toDate() || new Date()
          }));
          aggregated.push({
            product,
            reviews
          });
        }

        aggregated.sort((a, b) => b.reviews.length - a.reviews.length);
        setProductsWithReviews(aggregated);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        toast({
          title: "Error Loading Data",
          description: "Could not fetch the reviews. Please check permissions.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllReviews();
  }, [db, toast]);

  const handleDeleteReview = async (productId: string, reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db!, `shop_products/${productId}/reviews`, reviewId));
      
      // Update local state
      setProductsWithReviews(prev => prev.map(p => {
        if (p.product.id === productId) {
          return {
            ...p,
            reviews: p.reviews.filter((r: any) => r.id !== reviewId)
          };
        }
        return p;
      }).filter(p => p.reviews.length > 0));

      toast({
        title: "Review Deleted",
        description: "The review has been permanently removed.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the review. Please try again.",
        variant: "destructive"
      });
    }
  };

  const submitReview = async () => {
    if (!selectedProductId || !newReview.name || !newReview.text || !newReview.rating) {
      toast({ title: "Incomplete", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db!, `shop_products/${selectedProductId}/reviews`), {
        name: newReview.name,
        phone: newReview.phone || "Admin Entry",
        text: newReview.text,
        rating: newReview.rating,
        verified: true,
        createdAt: serverTimestamp()
      });
      
      setProductsWithReviews(prev => prev.map(p => {
        if (p.product.id === selectedProductId) {
           return {
             ...p,
             reviews: [{
               id: docRef.id,
               name: newReview.name,
               phone: newReview.phone || "Admin Entry",
               text: newReview.text,
               rating: newReview.rating,
               verified: true,
               createdAt: new Date()
             }, ...p.reviews]
           };
        }
        return p;
      }));
      
      toast({ title: "Review Added", description: "The manual review has been successfully published." });
      setIsAddModalOpen(false);
      setNewReview({ name: '', text: '', rating: 5, phone: '' });
    } catch (e) {
      toast({ title: "Error", description: "Could not add review. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-12 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
            <Link href="/admin/shop" className="hover:underline flex items-center gap-1 group">
               <MoveLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
               Shop Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-400 uppercase">Reviews</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tight uppercase">Review Management</h1>
          <p className="text-slate-500 font-medium">Monitor and moderate customer feedback across your entire curriculum catalog.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse">Aggregating Feedback...</p>
        </div>
      ) : productsWithReviews.length === 0 ? (
        <Reveal>
            <div className="bg-white border border-slate-100 rounded-[3rem] p-16 text-center shadow-xl shadow-black/5 flex flex-col items-center">
                <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                    <MessageSquareQuote className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black font-headline uppercase mb-2">No Reviews Yet</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto">Your products haven't received any reviews yet. Once students start leaving feedback, they will appear here for moderation.</p>
            </div>
        </Reveal>
      ) : (
        <div className="space-y-12">
            {productsWithReviews.map((item, index) => (
                <Reveal key={item.product.id} delay={index * 0.1}>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-black/5">
                        {/* Product Header */}
                        <div className="bg-slate-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-slate-200 relative shrink-0 border border-slate-200">
                                    <Image 
                                        src={item.product.images?.[0] || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400"} 
                                        alt={item.product.title} 
                                        fill 
                                        className="object-cover" 
                                    />
                                </div>
                                <div>
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest mb-2">
                                        {item.reviews.length} Review{item.reviews.length !== 1 ? 's' : ''}
                                    </Badge>
                                    <h2 className="text-lg sm:text-xl font-black uppercase leading-tight font-headline text-slate-900 line-clamp-1">{item.product.title}</h2>
                                    <Link href={`/products/${item.product.id}`} target="_blank" className="text-xs font-bold text-slate-400 hover:text-primary transition-colors mt-1 block">View Product Page &rarr;</Link>
                                </div>
                            </div>
                            <Button 
                                onClick={() => { setSelectedProductId(item.product.id); setIsAddModalOpen(true); }}
                                className="bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 hover:text-primary font-bold shadow-sm rounded-full h-10 px-6 gap-2 shrink-0 self-start sm:self-auto"
                            >
                                <Plus className="h-4 w-4" />
                                Add Review
                            </Button>
                        </div>

                        {/* Reviews List */}
                        {item.reviews.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                              {item.reviews.map((review: any) => (
                                  <div key={review.id} className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 hover:bg-slate-50/50 transition-colors group">
                                      <div className="w-full sm:w-48 shrink-0 space-y-2">
                                          <div className="flex text-yellow-400">
                                              {[...Array(review.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                                              {[...Array(5 - review.rating)].map((_, i) => <Star key={i} className="h-4 w-4 text-slate-200" />)}
                                          </div>
                                          <p className="font-black text-slate-900 text-sm truncate">{review.name}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                              {review.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </p>
                                      </div>
                                      <div className="flex-grow">
                                          <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4 py-1">"{review.text}"</p>
                                      </div>
                                      <div className="shrink-0 pt-2 sm:pt-0">
                                          <Button 
                                              onClick={() => handleDeleteReview(item.product.id, review.id)}
                                              variant="ghost" 
                                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-10 w-10 rounded-full p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                              title="Delete Review"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 font-medium text-sm italic">
                            No reviews published for this module yet.
                          </div>
                        )}
                    </div>
                </Reveal>
            ))}
        </div>
      )}

      {/* Manual Review Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase font-headline">Add Manual Review</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="h-5 w-5" /></button>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Name</label>
                   <input type="text" value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})} className="w-full h-12 rounded-xl bg-slate-50 border border-slate-100 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-semibold" placeholder="John Doe" />
                </div>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating (1-5)</label>
                   <div className="flex gap-2">
                     {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setNewReview({...newReview, rating: star})} className={`p-2 rounded-full ${newReview.rating >= star ? 'text-yellow-400 bg-yellow-50' : 'text-slate-300 bg-slate-50'}`}>
                           <Star className="h-6 w-6 fill-current" />
                        </button>
                     ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Text</label>
                   <textarea value={newReview.text} onChange={e => setNewReview({...newReview, text: e.target.value})} className="w-full h-32 rounded-xl bg-slate-50 border border-slate-100 p-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium resize-none" placeholder="This course was amazing because..." />
                </div>
             </div>

             <Button onClick={submitReview} disabled={isSubmitting} className="w-full h-14 rounded-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Publish Review
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
