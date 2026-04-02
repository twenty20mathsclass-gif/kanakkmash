'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, User, Mail, Phone, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AssessmentFormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    class: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useState(() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setInvoiceId(params.get('invoiceId'));
    }
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp number is required';
    else if (!/^\d{10,15}$/.test(formData.whatsapp.replace(/[\s+\-()]/g, '')))
      newErrors.whatsapp = 'Enter a valid WhatsApp number';
    if (!formData.class) newErrors.class = 'Please select your class';
    return newErrors;
  };

  const { firestore } = useFirebase();
  const { user } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);

    try {
      if (firestore) {
        const submissionData = {
          ...formData,
          email: formData.email.toLowerCase(), // Normalize email for case-insensitive search
          whatsapp: formData.whatsapp.replace(/[^\d+]/g, ''), // Normalize number (strip spaces/symbols)
          isLoggedIn: !!user,
          isLogged: !!user,
          userId: user?.id || null,
          userEmail: user?.email ? user.email.toLowerCase() : null,
          invoiceId: invoiceId || null,
          assessmentType: invoiceId ? 'paid' : 'free',
          submittedAt: serverTimestamp(),
          status: 'started'
        };
        await addDoc(collection(firestore, 'assessment'), submissionData);
      }
      
      sessionStorage.setItem('assessmentUser', JSON.stringify(formData));
      await new Promise((r) => setTimeout(r, 800));
      router.push(`/assessment-test${invoiceId ? `?invoiceId=${invoiceId}` : ''}`);
    } catch (err: any) {
      console.warn("Failed to save assessment registration:", err);
      setErrors({ form: "Could not register details. Please check your connection and try again." });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle background pattern matching the home page */}
      <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.06)_1px,transparent_1px)] [background-size:8px_8px] -z-10" />
      <div className="absolute top-[-15%] right-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-accent/10 rounded-full blur-3xl -z-10" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <Image src="/fv.png" alt="Assessment Icon" width={64} height={64} className="rounded-2xl shadow-md object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1 font-headline">Assessment Test</h1>
            <p className="text-muted-foreground text-sm">Fill in your details to begin the test</p>
          </div>

          {errors.form && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm font-medium">
                <AlertCircle size={18} />
                <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-background border ${
                    errors.name ? 'border-destructive' : 'border-input'
                  } text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm`}
                />
              </div>
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. john@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-background border ${
                    errors.email ? 'border-destructive' : 'border-input'
                  } text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm`}
                />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-1.5">WhatsApp Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="e.g. +91 9876543210"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-background border ${
                    errors.whatsapp ? 'border-destructive' : 'border-input'
                  } text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm`}
                />
              </div>
              {errors.whatsapp && <p className="text-destructive text-xs mt-1">{errors.whatsapp}</p>}
            </div>

            {/* Class */}
            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-1.5">Class</label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-background border ${
                    errors.class ? 'border-destructive' : 'border-input'
                  } text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm appearance-none cursor-pointer`}
                >
                  <option value="" className="text-muted-foreground">Select your class</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((cls) => (
                    <option key={cls} value={`Class ${cls}`}>
                      Class {cls}
                    </option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" />
              </div>
              {errors.class && <p className="text-destructive text-xs mt-1">{errors.class}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#F97316] to-[#F59E0B] hover:from-[#ea6c0a] hover:to-[#e08f08] transition-all shadow-md hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Starting Test…
                </>
              ) : (
                <>
                  Start Assessment Test
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          By continuing, you agree to our{' '}
          <Link href="/terms-and-conditions" className="underline hover:text-foreground transition-colors">
            Terms & Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}
