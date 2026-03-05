
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails } from '@/lib/definitions';
import { z } from 'zod';

const updateUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    role: z.enum(['student', 'teacher', 'admin']),
    hourlyRate: z.coerce.number().optional(),
});

interface EditUserDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, isOpen, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [hourlyRate, setHourlyRate] = useState(user.hourlyRate || 0);

  useEffect(() => {
    if (isOpen) {
        setName(user.name);
        setRole(user.role);
        setHourlyRate(user.hourlyRate || 0);
        setError(null);
        setValidationErrors({});
    }
  }, [isOpen, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    const formObject = {
        name,
        role,
        hourlyRate: role === 'teacher' ? hourlyRate : undefined,
    }

    const validatedFields = updateUserSchema.safeParse(formObject);

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        setValidationErrors(fieldErrors);
        setLoading(false);
        return;
    }

    if (!firestore) {
        setError("Firestore is not available.");
        setLoading(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', user.id);
    const privateDetailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');

    try {
        const dataToUpdate: Partial<User> = {
            name: validatedFields.data.name,
            role: validatedFields.data.role,
        };

        await updateDoc(userDocRef, dataToUpdate);

        if (validatedFields.data.role === 'teacher') {
            const privateDetails: TeacherPrivateDetails = { hourlyRate: validatedFields.data.hourlyRate };
            await setDoc(privateDetailsRef, privateDetails, { merge: true });
        }

        toast({
            title: 'Success',
            description: `Successfully updated user ${name}.`,
        });
        
        onUserUpdated();
        onOpenChange(false);
    } catch (e: any) {
        setError(e.message || 'An unknown error occurred.');
    } finally {
        setLoading(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setValidationErrors({});
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.name}</DialogTitle>
          <DialogDescription>
            Modify the user's details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            {validationErrors?.name && (
              <p className="text-sm text-destructive">{validationErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'student' | 'teacher' | 'admin')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors?.role && (
                <p className="text-sm text-destructive">{validationErrors.role[0]}</p>
            )}
          </div>

          {role === 'teacher' && (
            <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (INR)</Label>
                <Input id="hourlyRate" name="hourlyRate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                {validationErrors?.hourlyRate && (
                    <p className="text-sm text-destructive">{validationErrors.hourlyRate[0]}</p>
                )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
