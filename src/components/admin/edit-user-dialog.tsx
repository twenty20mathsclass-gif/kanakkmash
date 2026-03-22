
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const updateUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    role: z.enum(['student', 'teacher', 'admin', 'promoter']),
    teachingMode: z.enum(['group', 'one to one', 'both']).optional(),
    hourlyRateGroup: z.coerce.number().optional(),
    hourlyRateOneToOne: z.coerce.number().optional(),
    rewardPercentage: z.coerce.number().optional(),
    assignedClasses: z.array(z.string()).optional(),
    assignedCompetitiveExams: z.array(z.string()).optional(),
    assignedTwenty20Levels: z.array(z.string()).optional(),
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
    values: {
      name: user.name,
      role: user.role,
      teachingMode: user.teachingMode || 'both',
      hourlyRateGroup: user.hourlyRateGroup || user.hourlyRate || 0,
      hourlyRateOneToOne: user.hourlyRateOneToOne || user.hourlyRate || 0,
      rewardPercentage: user.rewardPercentage || 10,
      assignedClasses: user.assignedClasses?.filter(c => classes.includes(c)) || [],
      assignedCompetitiveExams: user.assignedClasses?.filter(c => competitiveExams.includes(c)) || [],
      assignedTwenty20Levels: user.assignedClasses?.filter(c => twenty20Levels.includes(c)) || [],
    },
  });

  const { watch } = form;
  const role = watch('role');

  useEffect(() => {
    if(isOpen) {
        setError(null);
        form.reset({
            name: user.name,
            role: user.role,
            teachingMode: user.teachingMode || 'both',
            hourlyRateGroup: user.hourlyRateGroup || user.hourlyRate || 0,
            hourlyRateOneToOne: user.hourlyRateOneToOne || user.hourlyRate || 0,
            rewardPercentage: user.rewardPercentage || 10,
            assignedClasses: user.assignedClasses?.filter(c => classes.includes(c)) || [],
            assignedCompetitiveExams: user.assignedClasses?.filter(c => competitiveExams.includes(c)) || [],
            assignedTwenty20Levels: user.assignedClasses?.filter(c => twenty20Levels.includes(c)) || [],
        });
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
    const teacherPrivateDetailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
    const promoterPrivateDetailsRef = doc(firestore, 'users', user.id, 'promoter_details', 'payment');

    try {
        const dataToUpdate: any = {
            name: data.name,
            role: data.role,
        };

        if (data.role === 'teacher') {
            dataToUpdate.teachingMode = data.teachingMode || 'both';
            dataToUpdate.assignedClasses = [
                ...(data.assignedClasses || []),
                ...(data.assignedCompetitiveExams || []),
                ...(data.assignedTwenty20Levels || [])
            ];
        } else {
            dataToUpdate.assignedClasses = []; // Clear if not a teacher
            delete dataToUpdate.teachingMode;
        }

        await updateDoc(userDocRef, dataToUpdate);

        if (data.role === 'teacher') {
            const privateDetails: TeacherPrivateDetails = { 
                hourlyRateGroup: data.hourlyRateGroup,
                hourlyRateOneToOne: data.hourlyRateOneToOne,
            };
            await setDoc(teacherPrivateDetailsRef, privateDetails, { merge: true });
        }
        
        if (data.role === 'promoter') {
            const privateDetails: PromoterPrivateDetails = { rewardPercentage: data.rewardPercentage };
            await setDoc(promoterPrivateDetailsRef, privateDetails, { merge: true });
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
                path: `users/${user.id} or related subcollection`,
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
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
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
                      <SelectItem value="promoter">Promoter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'teacher' && (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 px-1">
                    <FormField
                        control={form.control}
                        name="teachingMode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teaching Mode</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select teaching mode" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="group">Group Mode</SelectItem>
                                        <SelectItem value="one to one">One to One Mode</SelectItem>
                                        <SelectItem value="both">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="hourlyRateGroup"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hourly Rate (Group)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hourlyRateOneToOne"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hourly Rate (1-1)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="assignedClasses"
                        render={({ field }) => {
                            const selectedCount = field.value?.length || 0;
                            return (
                                <FormItem>
                                    <FormLabel>Assigned Regular Classes</FormLabel>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    {selectedCount > 0 ? `${selectedCount} selected` : 'Select classes'}
                                                </Button>
                                            </FormControl>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            <DropdownMenuLabel>Available Classes</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {classes.map(c => (
                                                <DropdownMenuCheckboxItem
                                                    key={c}
                                                    checked={field.value?.includes(c)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        const newValues = checked
                                                            ? [...currentValues, c]
                                                            : currentValues.filter(val => val !== c);
                                                        field.onChange(newValues);
                                                    }}
                                                >
                                                    {c}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <FormMessage />
                                </FormItem>
                            )
                        }}
                    />
                     <FormField
                        control={form.control}
                        name="assignedCompetitiveExams"
                        render={({ field }) => {
                            const selectedCount = field.value?.length || 0;
                            return (
                                <FormItem>
                                    <FormLabel>Assigned Competitive Exams</FormLabel>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    {selectedCount > 0 ? `${selectedCount} selected` : 'Select exams'}
                                                </Button>
                                            </FormControl>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            <DropdownMenuLabel>Available Exams</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {competitiveExams.map(c => (
                                                <DropdownMenuCheckboxItem
                                                    key={c}
                                                    checked={field.value?.includes(c)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        const newValues = checked
                                                            ? [...currentValues, c]
                                                            : currentValues.filter(val => val !== c);
                                                        field.onChange(newValues);
                                                    }}
                                                >
                                                    {c}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <FormMessage />
                                </FormItem>
                            )
                        }}
                    />
                    <FormField
                        control={form.control}
                        name="assignedTwenty20Levels"
                        render={({ field }) => {
                            const selectedCount = field.value?.length || 0;
                            return (
                                <FormItem>
                                    <FormLabel>Assigned Twenty 20 Levels</FormLabel>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    {selectedCount > 0 ? `${selectedCount} selected` : 'Select levels'}
                                                </Button>
                                            </FormControl>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            <DropdownMenuLabel>Available Levels</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {twenty20Levels.map(l => (
                                                <DropdownMenuCheckboxItem
                                                    key={l}
                                                    checked={field.value?.includes(l)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        const newValues = checked
                                                            ? [...currentValues, l]
                                                            : currentValues.filter(val => val !== l);
                                                        field.onChange(newValues);
                                                    }}
                                                >
                                                    {l}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <FormMessage />
                                </FormItem>
                            )
                        }}
                    />
                </div>
            )}
            
            {role === 'promoter' && (
                <FormField
                control={form.control}
                name="rewardPercentage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reward Percentage (%)</FormLabel>
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
