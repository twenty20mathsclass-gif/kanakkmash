"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  ShoppingCart,
  Star,
  BookOpen,
  MoveLeft,
  Trophy,
  ShieldCheck,
  Zap,
  StarHalf,
  ThumbsUp,
  Loader2,
  CheckCircle2,
  X
} from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { doc, getDoc, collection, getDocs, query, limit, where, addDoc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerPhone, setReviewerPhone] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!firestore || !id) return;
    
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(firestore, 'shop_products', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() };
          setProduct(productData);
          
          // Fetch related products
          const q = query(
            collection(firestore, 'shop_products'),
            where('status', '==', 'active'),
            limit(5)
          );
          const relatedSnap = await getDocs(q);
          const related = relatedSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => d.id !== docSnap.id)
            .slice(0, 4);
          setRelatedProducts(related);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();

    // Listen to Reviews
    const reviewsRef = collection(firestore, `shop_products/${id}/reviews`);
    const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(reviewsQuery, (snap) => {
      const fetchedReviews = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setReviews(fetchedReviews);
      setLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [firestore, id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewerName.trim() || !reviewerPhone.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter your name and phone number.",
        variant: "destructive"
      });
      return;
    }
    if (!reviewText.trim()) {
      toast({
        title: "Empty Review",
        description: "Please write something before submitting.",
        variant: "destructive"
      });
      return;
    }

    setSubmittingReview(true);
    try {
      let isVerified = false;
      const ordersQ = query(collection(firestore!, 'shop_orders'), where('phone', '==', reviewerPhone));
      const ordersSnap = await getDocs(ordersQ);
      
      for (const orderDoc of ordersSnap.docs) {
         const orderData = orderDoc.data();
         if (orderData.status === 'completed' || orderData.status === 'success') {
            const hasPurchased = orderData.cart?.some((item: any) => item.id === id);
            if (hasPurchased) {
                isVerified = true;
                break;
            }
         }
      }

      await addDoc(collection(firestore!, `shop_products/${id}/reviews`), {
        userId: user?.uid || "anonymous",
        name: reviewerName,
        phone: reviewerPhone,
        rating,
        text: reviewText,
        verified: isVerified,
        createdAt: serverTimestamp()
      });
      toast({
        title: "Review Submitted",
        description: "Thank you for sharing your experience!",
      });
      setShowReviewForm(false);
      setReviewText("");
      setRating(5);
      setReviewerName("");
      setReviewerPhone("");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Submission Failed",
        description: "Could not post your review. Try again later.",
        variant: "destructive"
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold text-slate-500 animate-pulse">Loading product details...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h1 className="text-2xl font-black italic text-slate-400">
          Course not found...
        </h1>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link href="/shop">Back to Collection</Link>
        </Button>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000"];
  const currentImage = images[selectedImageIndex] || images[0];

  // Calculate Rating Stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";
    
  const getRatingPercentage = (stars: number) => {
    if (totalReviews === 0) return 0;
    const count = reviews.filter(r => r.rating === stars).length;
    return Math.round((count / totalReviews) * 100);
  };

  const renderStars = (ratingValue: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= ratingValue) {
            stars.push(<Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />);
        } else if (i - 0.5 <= ratingValue) {
            stars.push(<StarHalf key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />);
        } else {
            stars.push(<Star key={i} className="h-5 w-5 text-slate-200" />);
        }
    }
    return stars;
  };

  return (
    <div className="pb-24 mt-4 sm:mt-12 bg-white">
      {/* 1. Header Breadcrumbs */}
      <div className="px-4 mb-4 sm:mb-10 max-w-[1400px] mx-auto">
        <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full font-bold px-4 h-10 transition-colors w-fit -ml-4"
        >
            <MoveLeft className="h-4 w-4" /> 
            Back
        </Button>
      </div>

      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20">
          {/* 2. Left Column: Premium Image Gallery */}
          <div className="space-y-4 sm:space-y-6">
            <Reveal>
              <div className="relative aspect-[4/5] sm:aspect-square rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100">
                <Image
                  src={currentImage}
                  alt={product.title}
                  fill
                  className="object-cover transition-opacity duration-500"
                  priority
                />
              </div>
            </Reveal>

            {/* Thumbnail Row */}
            {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img: string, i: number) => (
                    <button
                        key={i}
                        onClick={() => setSelectedImageIndex(i)}
                        className={cn(
                            "relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden border-2 transition-all",
                            selectedImageIndex === i ? "border-primary shadow-lg scale-[1.02]" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                    <Image src={img} alt={`${product.title} view ${i+1}`} fill className="object-cover" />
                    </button>
                ))}
                </div>
            )}
          </div>

          {/* 3. Right Column: Shopify-Style Product Details */}
          <div className="space-y-8 lg:pt-8">
            <Reveal delay={0.1}>
              <div className="space-y-6">
                <div>
                  <Badge className="bg-primary/10 text-primary border-none font-bold text-[9px] uppercase tracking-widest px-3 py-1 mb-4">
                    ACADEMY MODULE
                  </Badge>
                  
                  <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tighter uppercase leading-tight mb-4">
                    {product.title}
                  </h1>
                  
                  {/* Rating Badge */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex">
                        {renderStars(Number(averageRating))}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{averageRating}</span>
                    <span className="text-sm font-medium text-slate-400 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-600">({totalReviews} Reviews)</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 mt-4">
                    <div className="flex items-center text-4xl font-black text-slate-900 leading-none">
                        <IndianRupee className="h-6 w-6" strokeWidth={3} />
                        {product.price?.toLocaleString('en-IN')}
                    </div>
                    <p className="text-sm font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full w-fit">Inclusive of all taxes</p>
                  </div>
                </div>

                <div className="py-6 border-y border-slate-100">
                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>

                {/* Trust Badge Module */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  {[
                    { icon: ShieldCheck, label: "SECURE ACCESS", sub: "Bank grade encryption" },
                    { icon: Trophy, label: "EXPERT LED", sub: "World-class instructors" },
                    { icon: BookOpen, label: "FULL CURRICULUM", sub: "Comprehensive modules" },
                    { icon: Zap, label: "LIFETIME VALIDITY", sub: "Learn at your pace" },
                  ].map((trust, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                          <trust.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{trust.label}</p>
                          <p className="text-[10px] font-medium text-slate-500">{trust.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6">
                  <Button
                    onClick={handleAddToCart}
                    className="w-full h-16 rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.01] text-sm font-black uppercase tracking-[0.1em] gap-3 transition-all active:scale-95"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    ADD TO CART
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 4. Customer Reviews Section (Shopify Style) */}
        <div className="pt-32 pb-16 border-b border-slate-100">
            <Reveal>
                <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
                    {/* Review Summary */}
                    <div className="w-full md:w-1/3 space-y-6">
                        <h2 className="text-3xl font-black font-headline tracking-tighter uppercase">Customer Reviews</h2>
                        <div className="flex items-center gap-4">
                            <div className="flex text-yellow-400">
                                {renderStars(Number(averageRating))}
                            </div>
                            <span className="text-sm font-medium text-slate-500">Based on {totalReviews} reviews</span>
                        </div>
                        <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map((stars) => {
                                const percent = getRatingPercentage(stars);
                                return (
                                <div key={stars} className="flex items-center gap-4 text-sm font-bold text-slate-600">
                                    <span className="w-12">{stars} Stars</span>
                                    <div className="flex-grow h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="w-8 text-right">{percent}%</span>
                                </div>
                                );
                            })}
                        </div>
                        <Button 
                            onClick={() => setShowReviewForm(!showReviewForm)}
                            variant="outline" 
                            className="w-full rounded-full h-12 font-bold border-slate-200"
                        >
                            {showReviewForm ? "Cancel Review" : "Write a Review"}
                        </Button>

                        {/* Review Form */}
                        {showReviewForm && (
                            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 mt-4 animate-in fade-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Your Name</label>
                                        <input 
                                            type="text"
                                            value={reviewerName}
                                            onChange={(e) => setReviewerName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Purchased Number</label>
                                        <input 
                                            type="tel"
                                            value={reviewerPhone}
                                            onChange={(e) => setReviewerPhone(e.target.value)}
                                            placeholder="Phone Number"
                                            className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Rating</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star} 
                                                onClick={() => setRating(star)}
                                                className="focus:outline-none hover:scale-110 transition-transform"
                                            >
                                                <Star className={cn("h-8 w-8", rating >= star ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Your Review</label>
                                    <textarea 
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        placeholder="How was your experience?"
                                        rows={4}
                                        className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    />
                                </div>
                                <Button 
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview}
                                    className="w-full rounded-full h-12 font-bold bg-primary text-white"
                                >
                                    {submittingReview ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Review"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Review List */}
                    <div className="w-full md:w-2/3 space-y-8">
                        {loadingReviews ? null : reviews.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-[2rem]">
                                <p className="text-slate-500 font-medium">No reviews yet. Be the first to share your thoughts!</p>
                            </div>
                        ) : (
                            reviews.map((review, i) => (
                                <div key={i} className="space-y-4 pb-8 border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex text-yellow-400">
                                            {[...Array(review.rating)].map((_, idx) => <Star key={idx} className="h-4 w-4 fill-current" />)}
                                            {[...Array(5 - review.rating)].map((_, idx) => <Star key={idx} className="h-4 w-4 text-slate-200" />)}
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">
                                            {review.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 flex items-center gap-2">
                                            {review.name}
                                            {review.verified && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-slate-600 font-medium leading-relaxed">{review.text}</p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1.5">
                                            <ThumbsUp className="h-3 w-3" /> Helpful
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Reveal>
        </div>

        {/* 5. You Might Also Like Section */}
        {relatedProducts.length > 0 && (
            <div className="pt-24 pb-12">
            <Reveal>
                <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-6xl font-black font-headline tracking-tighter uppercase mb-4">
                    YOU MIGHT ALSO LIKE
                </h2>
                <p className="text-slate-400 font-medium">
                    Curated world-class selections from our elite catalog.
                </p>
                </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                {relatedProducts.map((item, index) => {
                const itemImage = item.images?.[0] || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800";
                return (
                    <Reveal key={item.id} delay={index * 0.1}>
                    <Link
                        href={`/products/${item.id}`}
                        className="group block space-y-6"
                    >
                        <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-50 border border-slate-100 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                        <Image
                            src={itemImage}
                            alt={item.title}
                            fill
                            className="object-cover"
                        />
                        </div>
                        <div className="space-y-1 text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            MATHEMATICS
                        </p>
                        <h3 className="text-base sm:text-lg font-black font-headline tracking-tight uppercase group-hover:text-primary transition-colors leading-tight">
                            {item.title}
                        </h3>
                        <div className="flex items-center justify-center font-black text-sm text-slate-900 mt-2">
                            <IndianRupee className="h-3 w-3" strokeWidth={3} />
                            {item.price?.toLocaleString('en-IN')}
                        </div>
                        </div>
                    </Link>
                    </Reveal>
                );
                })}
            </div>
            </div>
        )}
      </div>
    </div>
  );
}
