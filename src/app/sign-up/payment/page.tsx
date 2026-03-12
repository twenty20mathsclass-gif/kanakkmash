
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/lib/countries';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User, PromoterPrivateDetails } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

function PaymentComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpData, setSignUpData] = useState<any | null>(null);
  const registrationAmount = signUpData?.registrationAmount ?? 99;

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Retrieve data from session storage
    const storedData = sessionStorage.getItem('kanakkmash_signup_data');
    if (storedData) {
      setSignUpData(JSON.parse(storedData));
    } else {
      // If no data, user shouldn't be here. Redirect back.
      toast({ title: "Session expired", description: "Please fill out the sign-up form again.", variant: "destructive"});
      router.replace('/sign-up');
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [router, toast]);
  
  const handlePayment = async () => {
    if (!signUpData) {
        toast({ title: "Error", description: "Sign-up information is missing. Please start over.", variant: "destructive"});
        router.replace('/sign-up');
        return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setError('Payment gateway is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError(null);
    const data = signUpData;

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: registrationAmount * 100, // Amount in the smallest currency unit (paise)
      currency: 'INR',
      name: 'kanakkmash',
      description: 'Student Registration Fee',
      image: 'https://www.kanakkmash.com/fv.png',
      handler: async (response: any) => {
        try {
          if (!auth || !firestore) throw new Error('Firebase not initialized.');

          const referralId = sessionStorage.getItem('kanakkmash_referral_id');

          let referrer: User | null = null;
          let promoterDetails: PromoterPrivateDetails | null = null;

          if (referralId) {
              const referrerDocRef = doc(firestore, 'users', referralId);
              const referrerDocSnap = await getDoc(referrerDocRef);
              if (referrerDocSnap.exists()) {
                  referrer = referrerDocSnap.data() as User;
                  if (referrer.role === 'promoter') {
                      const promoterDetailsRef = doc(firestore, 'users', referralId, 'promoter_details', 'payment');
                      const promoterDetailsSnap = await getDoc(promoterDetailsRef);
                      if (promoterDetailsSnap.exists()) {
                          promoterDetails = promoterDetailsSnap.data() as PromoterPrivateDetails;
                      }
                  }
              }
          }

          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const authUser = userCredential.user;
          

          const avatarUrl = `https://i.ibb.co/688z9X5/user.png`;
          await updateProfile(authUser, { displayName: data.name, photoURL: avatarUrl });

          const selectedCountry = countries.find(c => c.code === data.countryCode);
          const phoneCode = selectedCountry ? selectedCountry.phone : data.countryCode;

          const userProfile: any = {
            id: authUser.uid,
            name: data.name,
            email: data.email,
            role: 'student' as 'student',
            avatarUrl,
            courseModel: data.courseModel,
            countryCode: phoneCode,
            mobile: data.mobile,
            class: data.class,
            syllabus: data.syllabus,
            competitiveExam: data.competitiveExam,
            createdAt: serverTimestamp(),
          };

          const batch = writeBatch(firestore);
          const userDocRef = doc(firestore, 'users', authUser.uid);
          
          if (referralId) {
            userProfile.referredBy = referralId;
            const referralDocRef = doc(firestore, 'users', referralId, 'referrals', authUser.uid);
            const referralData = {
              studentId: authUser.uid,
              studentName: data.name,
              studentAvatarUrl: avatarUrl,
              courseModel: data.courseModel,
              referredAt: serverTimestamp()
            };
            batch.set(referralDocRef, referralData);
            
            if(referrer && referrer.role === 'promoter') {
                const rewardPercentage = (promoterDetails?.rewardPercentage || 10) / 100;
                const rewardAmount = registrationAmount * rewardPercentage;
                const rewardData = {
                    promoterId: referralId,
                    studentId: authUser.uid,
                    studentName: data.name,
                    feeAmount: registrationAmount,
                    rewardAmount: rewardAmount,
                    paidOut: false,
                    createdAt: serverTimestamp()
                };
                const rewardDocRef = doc(collection(firestore, 'rewards'));
                batch.set(rewardDocRef, rewardData);
            }
          }

          batch.set(userDocRef, userProfile);
          
          const invoiceData = {
            studentId: authUser.uid,
            amount: registrationAmount,
            status: 'paid',
            type: 'fee',
            createdAt: serverTimestamp(),
            dueDate: serverTimestamp(),
            paidAt: serverTimestamp(),
            paymentId: response.razorpay_payment_id,
            paymentMethod: 'razorpay'
          };
          const invoiceDocRef = doc(collection(firestore, 'invoices'));
          batch.set(invoiceDocRef, invoiceData);
          
          await batch.commit();

          // Clean up session storage
          sessionStorage.removeItem('kanakkmash_signup_data');
          if (referralId) sessionStorage.removeItem('kanakkmash_referral_id');
          
          router.push(`/invoice/${invoiceDocRef.id}`);

        } catch (err: any) {
          console.error("Registration failed:", err);
          setError(err.message || 'An unknown error occurred during registration.');
          if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: 'users or invoices or rewards', operation: 'create' }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
          }
          setLoading(false);
        }
      },
      prefill: {
        name: data.name,
        email: data.email,
        contact: `${data.countryCode}${data.mobile}`,
      },
      theme: {
        color: '#F5A718',
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast({
            title: 'Payment Cancelled',
            description: 'Your registration is not complete without payment.',
            variant: 'destructive',
          });
        },
      },
    };

    if (!(window as any).Razorpay) {
      setError('Payment gateway failed to load. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  if (!signUpData) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Complete Your Registration</CardTitle>
        <CardDescription>
          Please complete the payment to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center font-bold text-lg pt-2">
                <span>Registration Fee</span>
                <span className="flex items-center"><IndianRupee className="h-5 w-5" /> {registrationAmount.toFixed(2)}</span>
            </div>
        </div>

        <Button onClick={handlePayment} className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : `Pay ₹${registrationAmount}`}
        </Button>

        {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SignUpPaymentPage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            const targetPath = user.role === 'teacher' ? '/teacher' : '/dashboard';
            router.replace(targetPath);
        }
    }, [user, loading, router]);

    if (loading || (!loading && user)) {
        return null;
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="relative hidden bg-muted/30 lg:flex flex-col items-center justify-center p-8 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/.1)_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <Link href="/" className="absolute top-8 left-8 z-10">
                    <Image
                    src="/logo eng@4x.png"
                    alt="kanakkmash"
                    width={200}
                    height={62}
                    className="inline-block"
                    priority
                    unoptimized
                    />
                </Link>
                <div className='z-10 space-y-4'>
                    <Image 
                        src="https://i.ibb.co/L5QG0HV/cartoon-maths-elements-background-education-logo-vector.jpg"
                        width={600}
                        height={400}
                        alt="Illustration"
                        className="mx-auto rounded-lg shadow-lg"
                        data-ai-hint="maths elements"
                    />
                    <h1 className="font-headline text-4xl font-bold mt-4">One Last Step!</h1>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">Secure your spot by completing the registration payment.</p>
                </div>
            </div>
            <div className="flex items-center justify-center p-6 min-h-screen relative">
                <Link href="/sign-up" className="absolute top-4 left-4 z-10">
                    <Button variant="ghost">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Details
                    </Button>
                </Link>
                <div className="w-full">
                    <PaymentComponent />
                </div>
            </div>
        </div>
    );
}
