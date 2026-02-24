'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { AlertCircle, Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { useFirebase } from '@/firebase';
import type { User } from '@/lib/definitions';
import { z } from 'zod';

const createUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['student', 'teacher']),
});

export function AddUserDialog({ creatorRole = 'admin', onUserAdded }: { creatorRole?: 'admin' | 'teacher', onUserAdded?: () => void }) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    const formData = new FormData(event.currentTarget);
    const formObject = Object.fromEntries(formData.entries());

    const validatedFields = createUserSchema.safeParse(formObject);

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        setValidationErrors(fieldErrors);
        setLoading(false);
        return;
    }

    const { name, email, password, role } = validatedFields.data;

    // The main firestore instance from useFirebase() is used for the setDoc call,
    // which will be authenticated with the currently logged-in admin's credentials.
    // This allows the `isAdmin()` check in the security rules to pass.
    if (!firestore) {
        setError("Firestore is not available. Please try again later.");
        setLoading(false);
        return;
    }

    // Create a temporary app to create the user without signing the admin out
    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(
            tempAuth,
            email,
            password
        );
        const user = userCredential.user;

        const avatarUrl = `https://picsum.photos/seed/${user.uid}/100/100`;

        const userProfile: User = {
            id: user.uid,
            name: name,
            email: email,
            role: role as 'student' | 'teacher',
            avatarUrl: avatarUrl,
        };
        
        await setDoc(doc(firestore, 'users', user.uid), userProfile);
        
        toast({
            title: 'Success',
            description: `Successfully created user ${name}.`,
        });

        onUserAdded?.();
        setIsOpen(false);

    } catch (error: any) {
        let message = 'An unknown error occurred.';
        if (error.code === 'auth/email-already-in-use') {
            message = 'A user with this email already exists.';
        } else if (error.message) {
            message = error.message;
        }
        setError(message);
    } finally {
        await deleteApp(tempApp);
        setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state on close
      setError(null);
      setValidationErrors({});
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign them a role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" required />
            {validationErrors?.name && (
              <p className="text-sm text-destructive">{validationErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            {validationErrors?.email && (
              <p className="text-sm text-destructive">{validationErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
            {validationErrors?.password && (
              <p className="text-sm text-destructive">{validationErrors.password[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue="student" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                {creatorRole === 'admin' && (
                  <SelectItem value="teacher">Teacher</SelectItem>
                )}
              </SelectContent>
            </Select>
            {validationErrors?.role && (
                <p className="text-sm text-destructive">{validationErrors.role[0]}</p>
            )}
          </div>

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
              {loading ? <Loader2 className="animate-spin" /> : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
