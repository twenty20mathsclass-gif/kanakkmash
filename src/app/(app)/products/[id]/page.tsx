"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { courses } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  ShoppingCart,
  Star,
  PlayCircle,
  Clock,
  BookOpen,
  CheckCircle2,
  MoveLeft,
  Trophy,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const course = courses.find((c) => c.id === id);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h1 className="text-2xl font-black italic text-slate-400">
          Course not found...
        </h1>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link href="/products">Back to Collection</Link>
        </Button>
      </div>
    );
  }

  const courseImage =
    PlaceHolderImages.find((img) => img.id === course.imageId)?.imageUrl ||
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000";

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      router.push("/sign-in");
    } else {
      toast({
        title: "Success!",
        description: `${course.title} has been added to your cart.`,
      });
    }
  };

  const otherCourses = courses.filter((c) => c.id !== course.id).slice(0, 4);

  return (
    <div className="pb-24 mt-12 bg-white">
      {/* 1. Header Breadcrumbs */}
      <div className="px-4 mb-8 sm:mb-12 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
          <button
            onClick={() => router.back()}
            className="hover:text-black flex items-center justify-center gap-2 transition-colors uppercase"
          >
            <MoveLeft className="h-3 w-3" />
            back
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20">
          {/* 2. Left Column: Monolithic Visuals */}
          <div className="space-y-6">
            <Reveal>
              <div className="relative aspect-[4/5] rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-slate-50 group">
                <Image
                  src={courseImage}
                  alt={course.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                {/* Visual Pagination dots placeholder like mockup */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 w-[80%] opacity-40">
                  <div className="h-1 flex-1 bg-white rounded-full" />
                  <div className="h-1 flex-1 bg-white/30 rounded-full" />
                  <div className="h-1 flex-1 bg-white/30 rounded-full" />
                </div>
              </div>
            </Reveal>

            {/* Thumbnails like mockup */}
            <div className="grid grid-cols-3 gap-4 h-32 sm:h-44">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative h-full w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-50 border border-black/5 cursor-pointer hover:border-black/20 transition-all"
                >
                  <Image
                    src={courseImage}
                    alt={course.title}
                    fill
                    className="object-cover opacity-80"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Right Column: Clean Editorial Details */}
          <div className="space-y-10">
            <Reveal delay={0.1}>
              <div className="space-y-6">
                <div>
                  <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase tracking-widest px-3 py-1 mb-4">
                    ACADEMY MODULE
                  </Badge>
                  <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tighter uppercase leading-tight mb-2">
                    {course.title}
                  </h1>
                  <div className="flex items-center text-2xl font-black text-slate-900 leading-none mt-2">
                    <IndianRupee className="h-4 w-4" strokeWidth={3} />
                    2,250
                  </div>
                </div>

                <div className="pt-4 pb-10 space-y-8">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">
                      Mastery Narrative
                    </p>
                    <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                      {course.description} Engineered for absolute mastery in
                      mathematical frameworks. This world-class module provides{" "}
                      {course.modules.reduce(
                        (acc, m) => acc + m.lessons.length,
                        0,
                      )}{" "}
                      strategic lessons across {course.modules.length} modules.
                    </p>
                  </div>

                  {/* Trust Badge Module */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    {[
                      { icon: ShieldCheck, label: "SECURE ACCESS" },
                      { icon: Trophy, label: "EXPERT LED" },
                      { icon: BookOpen, label: "CURRICULUM ACCESS" },
                      { icon: Zap, label: "LIFETIME VALIDITY" },
                    ].map((trust, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <trust.icon className="h-4 w-4 text-green-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                          {trust.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleAddToCart}
                    className="w-full h-20 rounded-full bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-[1.02] text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                  >
                    BUY NOW
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 4. You Might Also Like Section */}
        <div className="pt-32 pb-12">
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
            {otherCourses.map((item, index) => {
              const itemImage =
                PlaceHolderImages.find((img) => img.id === item.imageId)
                  ?.imageUrl ||
                "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800";
              return (
                <Reveal key={item.id} delay={index * 0.1}>
                  <Link
                    href={`/products/${item.id}`}
                    className="group block space-y-6"
                  >
                    <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-50 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
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
                        2,250
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
