
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
import { getAuth, createUserWithEmailAndPassword, type UserCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { z } from 'zod';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const createUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['student', 'teacher', 'promoter']),
    hourlyRateGroup: z.coerce.number().optional(),
    hourlyRateOneToOne: z.coerce.number().optional(),
    rewardPercentage: z.coerce.number().optional(),
    teachingMode: z.enum(['group', 'one to one', 'both']).optional(),
});

export function AddUserDialog({ creatorRole = 'admin', onUserAdded }: { creatorRole?: 'admin' | 'teacher', onUserAdded?: () => void }) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState('student');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    const formData = new FormData(event.currentTarget);
    const formObject = Object.fromEntries(formData.entries());
    
    if (formObject.role !== 'teacher') {
        delete formObject.hourlyRateGroup;
        delete formObject.hourlyRateOneToOne;
        delete formObject.teachingMode;
    }
    if (formObject.role !== 'promoter') {
        delete formObject.rewardPercentage;
    }


    const validatedFields = createUserSchema.safeParse(formObject);

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        setValidationErrors(fieldErrors);
        setLoading(false);
        return;
    }

    const { name, email, password, role, hourlyRateGroup, hourlyRateOneToOne, rewardPercentage, teachingMode } = validatedFields.data;

    if (!firestore) {
        setError("Firestore is not available. Please try again later.");
        setLoading(false);
        return;
    }

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    let userCredential: UserCredential | undefined;

    try {
        userCredential = await createUserWithEmailAndPassword(
            tempAuth,
            email,
            password
        );
        const user = userCredential.user;

        const avatarUrl = `https://i.ibb.co/688z9X5/user.png`;

        const userProfile: any = {
            id: user.uid,
            name: name,
            email: email,
            role: role as 'student' | 'teacher' | 'promoter',
            avatarUrl: avatarUrl,
            createdAt: serverTimestamp(),
        };

        if (role === 'teacher') {
            userProfile.teachingMode = teachingMode || 'both';
        }
        
        await setDoc(doc(firestore, 'users', user.uid), userProfile);
        
        if(role === 'teacher') {
            const privateDetails: TeacherPrivateDetails = { 
                hourlyRateGroup: hourlyRateGroup || 0,
                hourlyRateOneToOne: hourlyRateOneToOne || 0,
            };
            await setDoc(doc(firestore, 'users', user.uid, 'teacher_details', 'payment'), privateDetails);
        }
        
        if(role === 'promoter' && (rewardPercentage || rewardPercentage === 0)) {
            const privateDetails: PromoterPrivateDetails = { rewardPercentage };
            await setDoc(doc(firestore, 'users', user.uid, 'promoter_details', 'payment'), privateDetails, { merge: true });
        }
        
        toast({
            title: 'Success',
            description: `Successfully created user ${name}.`,
        });

        onUserAdded?.();
        setIsOpen(false);

    } catch (e: any) {
        if (e.code === 'permission-denied' && userCredential?.user) {
            // This is a Firestore permission error because auth succeeded.
            const user = userCredential.user;
            const permissionError = new FirestorePermissionError({
                path: `users/${user.uid}`,
                operation: 'create',
                requestResourceData: { name, email, role, hourlyRateGroup, hourlyRateOneToOne, rewardPercentage }
            }, { cause: e });
            errorEmitter.emit('permission-error', permissionError);
            setError('Permission denied when creating the user profile in the database.');
        } else if (e.code === 'auth/email-already-in-use') {
            setError('A user with this email already exists.');
        } else {
            console.warn('Error creating user:', e);
            setError(e.message || 'An unknown error occurred.');
        }
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
      setSelectedRole('student');
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
            <Select name="role" defaultValue="student" required onValueChange={(value) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                {creatorRole === 'admin' && (
                  <>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="promoter">Promoter</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {validationErrors?.role && (
                <p className="text-sm text-destructive">{validationErrors.role[0]}</p>
            )}
          </div>

          {selectedRole === 'teacher' && (
            <>
                <div className="space-y-2">
                    <Label htmlFor="teachingMode">Teaching Mode</Label>
                    <Select name="teachingMode" defaultValue="both">
                        <SelectTrigger>
                            <SelectValue placeholder="Select teaching mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="group">Group Mode</SelectItem>
                            <SelectItem value="one to one">One to One Mode</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="hourlyRateGroup">Hourly Rate (Group)</Label>
                        <Input id="hourlyRateGroup" name="hourlyRateGroup" type="number" defaultValue={0} />
                        {validationErrors?.hourlyRateGroup && (
                            <p className="text-sm text-destructive">{validationErrors.hourlyRateGroup[0]}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hourlyRateOneToOne">Hourly Rate (1-1)</Label>
                        <Input id="hourlyRateOneToOne" name="hourlyRateOneToOne" type="number" defaultValue={0} />
                        {validationErrors?.hourlyRateOneToOne && (
                            <p className="text-sm text-destructive">{validationErrors.hourlyRateOneToOne[0]}</p>
                        )}
                    </div>
                </div>
            </>
          )}

          {selectedRole === 'promoter' && (
            <div className="space-y-2">
                <Label htmlFor="rewardPercentage">Reward Percentage (%)</Label>
                <Input id="rewardPercentage" name="rewardPercentage" type="number" defaultValue={10} />
                {validationErrors?.rewardPercentage && (
                    <p className="text-sm text-destructive">{validationErrors.rewardPercentage[0]}</p>
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
              {loading ? <Loader2 className="animate-spin" /> : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
