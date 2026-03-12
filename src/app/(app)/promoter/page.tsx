

'use client';
import { useUser, useFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reveal } from '@/components/shared/reveal';
import { useState, useEffect } from 'react';
import type { Reward } from '@/lib/definitions'; 
import type { ReferredStudent } from '@/lib/definitions'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RevenueChart } from '@/components/promoter/revenue-chart';
import { ReferralsChart } from '@/components/promoter/referrals-chart';

export default function PromoterDashboardPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [referrals, setReferrals] = useState<ReferredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!firestore || !user) return;
    
    let active = true;
    setLoading(true);

    const rewardsQuery = query(collection(firestore, 'users', user.id, 'rewards'), orderBy('createdAt', 'desc'));
    const referralsQuery = query(collection(firestore, 'users', user.id, 'referrals'), orderBy('referredAt', 'desc'));
    
    const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
        if (!active) return;
        const rewardsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
        setRewards(rewardsList);
    }, (err) => {
        if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}/rewards`, operation: 'list' }, { cause: err }));
        } else {
            console.warn("Error fetching rewards:", err);
        }
    });

    const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
        if (!active) return;
        const referralsList = snapshot.docs.map(doc => doc.data() as ReferredStudent);
        setReferrals(referralsList);
    }, (err) => {
         if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}/referrals`, operation: 'list' }, { cause: err }));
        } else {
            console.warn("Error fetching referrals:", err);
        }
    });
    
    // A simple way to wait for both snapshots to at least run once
    Promise.all([
      new Promise(resolve => onSnapshot(rewardsQuery, resolve, (e) => resolve(e))),
      new Promise(resolve => onSnapshot(referralsQuery, resolve, (e) => resolve(e)))
    ]).then(() => {
        if (active) setLoading(false);
    });

    return () => {
        active = false;
        unsubRewards();
        unsubReferrals();
    }
  }, [firestore, user]);

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">
            Welcome, {user?.name || 'Promoter'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your promoter activities.
          </p>
        </div>
      </Reveal>
      
      {loading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Reveal delay={0.1}>
            <RevenueChart rewards={rewards} />
          </Reveal>
          <Reveal delay={0.2}>
            <ReferralsChart referrals={referrals} />
          </Reveal>
        </div>
      )}
    </div>
  );
}
