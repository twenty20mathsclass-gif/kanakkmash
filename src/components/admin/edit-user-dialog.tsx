
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
import { AlertCircle, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5' }
];

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
      assignedTwenty20Levels: user.assignedClasses?.filter(c => twenty20Levels.some(l => l.value === c)) || [],
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
            assignedTwenty20Levels: user.assignedClasses?.filter(c => twenty20Levels.some(l => l.value === c)) || [],
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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-y-auto max-h-[90vh] border-none shadow-2xl rounded-[2.5rem] gap-0 custom-scrollbar scrollbar-hide">
        <div className="bg-slate-900 p-8 pb-10 text-white relative">
            <div>
                <h2 className="text-2xl font-black font-headline tracking-tight">Edit Member Profile</h2>
                <p className="text-slate-400 text-xs font-medium mt-1">Configure account access and individual permissions.</p>
            </div>
            <div className="absolute top-8 right-8 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                <Edit className="h-6 w-6 text-slate-300" />
            </div>
        </div>

        <div className="p-8 bg-background">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Full Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-muted bg-muted/20 h-11 focus-visible:ring-primary/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">User Email (Login)</Label>
                        <Input type="email" value={user.email} disabled className="rounded-xl border-muted bg-muted/40 h-11 opacity-60 font-mono grayscale" />
                    </div>

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authentication Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-muted h-11 bg-muted/10 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              <SelectItem value="student" className="rounded-lg">Student Account</SelectItem>
                              <SelectItem value="teacher" className="rounded-lg">Professional Teacher</SelectItem>
                              <SelectItem value="admin" className="rounded-lg">Administrative User</SelectItem>
                              <SelectItem value="promoter" className="rounded-lg">Platform Promoter</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                {role === 'teacher' && (
                    <div className="p-5 rounded-[2rem] bg-primary/[0.03] border border-primary/5 space-y-5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Teacher Specialization</p>
                        
                        <FormField
                            control={form.control}
                            name="teachingMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Teaching Mode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl border-none bg-white shadow-sm h-10 font-medium">
                                                <SelectValue placeholder="Select teaching mode" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl border-none shadow-xl">
                                            <SelectItem value="group">Group Mode Only</SelectItem>
                                            <SelectItem value="one to one">One-to-One Only</SelectItem>
                                            <SelectItem value="both">Both (Flexible)</SelectItem>
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
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rate (Group)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                                            <Input type="number" {...field} className="pl-6 h-10 rounded-xl bg-white border-none shadow-sm font-bold" />
                                        </div>
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
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rate (1-1)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                                            <Input type="number" {...field} className="pl-6 h-10 rounded-xl bg-white border-none shadow-sm font-bold" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <div className="space-y-4 pt-1">
                            <FormField
                                control={form.control}
                                name="assignedClasses"
                                render={({ field }) => {
                                    const selectedCount = field.value?.length || 0;
                                    return (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Class Assignment</FormLabel>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className="w-full justify-between h-10 rounded-xl border-dashed bg-transparent hover:bg-white text-xs font-bold transition-all">
                                                            {selectedCount > 0 ? `${selectedCount} Assigned` : 'Select classes'}
                                                            <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                                                {selectedCount}
                                                            </div>
                                                        </Button>
                                                    </FormControl>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-2xl border-none shadow-2xl p-2 max-h-[300px] overflow-y-auto">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground px-2 py-1">Available Classes</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-muted/50" />
                                                    {classes.map(c => (
                                                        <DropdownMenuCheckboxItem
                                                            key={c}
                                                            className="rounded-lg"
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
                                            <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Competitive Exams</FormLabel>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className="w-full justify-between h-10 rounded-xl border-dashed bg-transparent hover:bg-white text-xs font-bold transition-all">
                                                            {selectedCount > 0 ? `${selectedCount} Exams` : 'Select exams'}
                                                            <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                                                {selectedCount}
                                                            </div>
                                                        </Button>
                                                    </FormControl>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-2xl border-none shadow-2xl p-2 max-h-[300px] overflow-y-auto">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground px-2 py-1">Exam List</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-muted/50" />
                                                    {competitiveExams.map(c => (
                                                        <DropdownMenuCheckboxItem
                                                            key={c}
                                                            className="rounded-lg"
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
                                            <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Twenty-20 Levels</FormLabel>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className="w-full justify-between h-10 rounded-xl border-dashed bg-transparent hover:bg-white text-xs font-bold transition-all">
                                                            {selectedCount > 0 ? `${selectedCount} Levels` : 'Select levels'}
                                                            <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                                                {selectedCount}
                                                            </div>
                                                        </Button>
                                                    </FormControl>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-2xl border-none shadow-2xl p-2 max-h-[300px] overflow-y-auto">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground px-2 py-1">Platform Levels</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-muted/50" />
                                                    {twenty20Levels.map(l => (
                                                        <DropdownMenuCheckboxItem
                                                            key={l.value}
                                                            className="rounded-lg"
                                                            checked={field.value?.includes(l.value)}
                                                            onCheckedChange={(checked) => {
                                                                const currentValues = field.value || [];
                                                                const newValues = checked
                                                                    ? [...currentValues, l.value]
                                                                    : currentValues.filter(val => val !== l.value);
                                                                field.onChange(newValues);
                                                            }}
                                                        >
                                                            {l.label}
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
                    </div>
                )}
                
                {role === 'promoter' && (
                    <div className="p-5 rounded-[2rem] bg-amber-500/[0.03] border border-amber-500/10 space-y-1">
                        <FormField
                            control={form.control}
                            name="rewardPercentage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reward Structure (%)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-bold">%</span>
                                            <Input type="number" {...field} className="h-11 rounded-xl bg-white border-amber-200 focus-visible:ring-amber-500 font-bold" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="rounded-2xl border-none shadow-md bg-red-50 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-bold">Execution Failed</AlertTitle>
                      <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end gap-3 pt-4 font-headline">
                    <DialogClose asChild>
                        <Button variant="ghost" type="button" className="rounded-2xl h-11 px-6 font-bold">Discard</Button>
                    </DialogClose>
                    <Button type="submit" disabled={loading} className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white h-11 px-10 font-black shadow-lg shadow-slate-200">
                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm Changes'}
                    </Button>
                </div>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
