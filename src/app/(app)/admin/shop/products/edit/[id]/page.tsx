'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { IndianRupee, Image as ImageIcon, Plus, Trash2, Save, X, MoveLeft, BookOpen, Layers, Info, PenSquare, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { firestore as db } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { uploadImage } from '@/lib/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  
  // Local state for the fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null]);

  const categories = [
    { id: 'books', name: 'Books' },
    { id: 'courses', name: 'Courses' },
    { id: 'materials', name: 'Materials' },
    { id: 'maths-products', name: 'Maths Products' }
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!db || !id) return;
      try {
        const docSnap = await getDoc(doc(db, 'shop_products', id as string));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setPrice(data.price ? data.price.toString() : '');
          setSelectedCategory(data.category || '');
          
          const fetchedImages = data.images || [];
          const paddedImages = [...fetchedImages, null, null, null, null].slice(0, 4);
          setImageUrls(paddedImages);
        } else {
          toast({
            title: "Not Found",
            description: "The requested product does not exist.",
            variant: "destructive"
          });
          router.push('/admin/shop/products');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setFetching(false);
      }
    };
    
    fetchProduct();
  }, [db, id, router, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const url = await uploadImage(formData);
      
      const newUrls = [...imageUrls];
      newUrls[index] = url;
      setImageUrls(newUrls);

      toast({
        title: "Image Uploaded",
        description: "Your module visual has been successfully stored in the cloud.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to store image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    if (!title || !price) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and a listing price for this module.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db!, 'shop_products', id as string), {
        title,
        description,
        price: Number(price),
        category: selectedCategory,
        images: imageUrls.filter(url => url !== null),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Module Updated",
        description: "Successfully updated the product in your marketplace catalog.",
      });
      router.push('/admin/shop/products');
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Operation Failed",
        description: "There was an error updating this module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <p className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse">Loading Details...</p>
        </div>
    );
  }

  return (
    <div className="p-6 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
             <button onClick={() => router.back()} className="hover:underline flex items-center gap-1 group">
                <MoveLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                Products
             </button>
             <span>/</span>
             <span className="text-slate-400 uppercase">EDIT MODULE</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter uppercase leading-none">Edit Product</h1>
          <p className="text-slate-500 font-medium font-sm max-w-lg">Update the details and visuals of your existing curriculum module.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" onClick={() => router.back()} className="rounded-2xl h-14 px-8 border-slate-100 flex gap-2 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50">
              <X className="h-4 w-4" />
              Discard
           </Button>
           <Button 
            onClick={handleSave} 
            disabled={loading}
            className="rounded-2xl h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-slate-900/10 min-w-[160px]"
           >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'SAVING...' : 'SAVE MODULE'}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Left Column: Essential Data */}
         <div className="lg:col-span-8 space-y-10">
            <Reveal>
               <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-black/5 space-y-8">
                  <div className="flex items-center gap-4 text-primary font-black uppercase text-xs tracking-widest border-b border-slate-50 pb-6 mb-8">
                     <Info className="h-5 w-5" />
                     Course Information
                  </div>
                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Title of Module</label>
                        <div className="relative">
                           <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                           <input 
                            type="text" 
                            placeholder="e.g., Advanced Mathematical Frameworks" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full h-16 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 pl-16 pr-8 focus:ring-2 focus:ring-primary/10 transition-all outline-none font-bold text-slate-800" 
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Narrative Description</label>
                        <div className="relative">
                           <PenSquare className="absolute left-6 top-8 h-5 w-5 text-slate-300" />
                           <textarea 
                            placeholder="Craft a compelling story for this course..." 
                            rows={6} 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-[1.5rem] bg-slate-50/50 border border-slate-100 pl-16 pr-8 pt-7 focus:ring-2 focus:ring-primary/10 transition-all outline-none font-medium text-slate-500 resize-none leading-relaxed" 
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Course Investment (INR)</label>
                        <div className="relative">
                           <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                           <input 
                            type="number" 
                            placeholder="2,250" 
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full h-16 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 pl-16 pr-8 focus:ring-2 focus:ring-primary/10 transition-all outline-none font-bold text-slate-800" 
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Module Category</label>
                        <div className="relative">
                           <Layers className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 z-10" />
                           <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                             <SelectTrigger className="w-full h-16 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 pl-16 pr-8 focus:ring-2 focus:ring-primary/10 transition-all outline-none font-bold text-slate-800">
                               <SelectValue placeholder="Select a category" />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-none shadow-2xl">
                               {categories.map(cat => (
                                 <SelectItem key={cat.id} value={cat.id} className="font-semibold">{cat.name}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                        </div>
                     </div>
                  </div>
               </div>
            </Reveal>
         </div>

         {/* Right Column: Imagery & Investment */}
         <div className="lg:col-span-4 space-y-10">
            <Reveal delay={0.2}>
               <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-black/5 space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
                    <div className="flex items-center gap-4 text-primary font-black uppercase text-xs tracking-widest">
                       <ImageIcon className="h-5 w-5" />
                       Media Assets (Max 4)
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Min 1 Required</span>
                  </div>
                  
                  {/* Enhanced 2x2 Image Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     {imageUrls.map((url, i) => (
                        <div 
                          key={i} 
                          onClick={() => !url && document.getElementById(`file-${i}`)?.click()}
                          className={`relative aspect-square rounded-[2rem] border-2 border-dashed ${url ? 'border-transparent' : 'border-slate-100'} flex flex-col items-center justify-center text-center p-4 gap-2 group hover:border-primary/20 hover:bg-slate-50/50 transition-all cursor-pointer overflow-hidden`}
                        >
                           <input 
                             type="file" 
                             id={`file-${i}`} 
                             className="hidden" 
                             accept="image/*"
                             onChange={(e) => handleFileChange(e, i)}
                           />
                           
                           {url ? (
                             <>
                                <Image src={url} alt={`Asset ${i}`} fill className="object-cover rounded-[1.8rem]" />
                                <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const newUrls = [...imageUrls];
                                   newUrls[i] = null;
                                   setImageUrls(newUrls);
                                 }}
                                 className="absolute top-3 right-3 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                   <X className="h-4 w-4" />
                                </button>
                             </>
                           ) : (
                             <>
                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                   {uploadingIndex === i ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                   ) : (
                                      <Plus className="h-4 w-4" />
                                   )}
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Slot {i + 1}</p>
                                   <p className="text-[7px] text-slate-200 font-medium">
                                      {uploadingIndex === i ? 'UPLOADING...' : 'SELECT IMAGE'}
                                   </p>
                                </div>
                             </>
                           )}
                        </div>
                     ))}
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic text-center">Architectural imagery creates a high-fidelity first impression for prospective students.</p>
               </div>
            </Reveal>
         </div>
      </div>
    </div>
  );
}
