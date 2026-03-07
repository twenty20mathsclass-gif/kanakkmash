
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const updateUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    role: z.enum(['student', 'teacher', 'admin']),
    hourlyRate: z.coerce.number().optional(),
});
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;


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

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
      hourlyRate: user.hourlyRate || 0,
    }
  });

  const role = form.watch('role');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: user.name,
        role: user.role,
        hourlyRate: user.hourlyRate || 0,
      });
      setError(null);
    }
  }, [isOpen, user, form]);

  const onSubmit = async (data: UpdateUserFormValues) => {
    setLoading(true);
    setError(null);
    
    if (!firestore) {
        setError("Firestore is not available.");
        setLoading(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', user.id);
    const privateDetailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');

    try {
        const dataToUpdate: Partial<User> = {
            name: data.name,
            role: data.role,
        };

        await updateDoc(userDocRef, dataToUpdate);

        if (data.role === 'teacher') {
            const privateDetails: TeacherPrivateDetails = { hourlyRate: data.hourlyRate };
            await setDoc(privateDetailsRef, privateDetails, { merge: true });
        }

        toast({
            title: 'Success',
            description: `Successfully updated user ${data.name}.`,
        });
        
        onUserUpdated();
        onOpenChange(false);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.id} or users/${user.id}/teacher_details/payment`,
                operation: 'update',
                requestResourceData: data
            }, { cause: e });
            errorEmitter.emit('permission-error', permissionError);
            setError('You do not have permission to update this user.');
        } else {
            console.warn('Error updating user:', e);
            setError(e.message || 'An unknown error occurred.');
        }
    } finally {
        setLoading(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} disabled />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'teacher' && (
                <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hourly Rate (INR)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
                <Button variant="ghost" type="button">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                </Button>
            </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
