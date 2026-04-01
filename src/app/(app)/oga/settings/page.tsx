'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Reveal } from '@/components/shared/reveal';
import { Loader2, Save, ArrowLeft, Clock, ToggleLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const CONFIG_DOC = 'assessment_config';
const CONFIG_ID = 'settings';

export default function OGASettingsPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!firestore) return;
      try {
        const ref = doc(firestore, CONFIG_DOC, CONFIG_ID);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDurationMinutes(data.durationMinutes ?? 5);
          setIsActive(data.isActive ?? true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [firestore]);

  const handleSave = async () => {
    if (!firestore || !user) return;
    if (durationMinutes < 1 || durationMinutes > 180) {
      toast({ title: 'Invalid Duration', description: 'Duration must be between 1 and 180 minutes.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(firestore, CONFIG_DOC, CONFIG_ID),
        {
          durationMinutes,
          isActive,
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        },
        { merge: true }
      );
      toast({ title: 'Saved', description: 'Assessment settings updated successfully.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/oga"><ArrowLeft /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Test Settings</h1>
            <p className="text-muted-foreground">Configure the public assessment test duration and activation.</p>
          </div>
        </div>
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <Reveal delay={0.1}>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>These settings apply to the live assessment test at <code>/assessment-test</code>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Test Duration (minutes)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">How long the student has to complete the assessment.</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between border border-border rounded-xl p-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <ToggleLeft className="h-4 w-4 text-primary" />
                    Assessment Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? 'Assessment is live and accessible to the public.' : 'Assessment is currently inactive.'}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
