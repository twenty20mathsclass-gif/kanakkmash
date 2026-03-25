'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { uploadImage } from '@/lib/actions';


const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters long.' }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    const [isUploading, setIsUploading] = useState(false);
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !firestore || !auth?.currentUser) return;

        setIsUploading(true);
        let downloadURL = '';

        try {
            // 1. Upload using server action to Cloudinary
            const formData = new FormData();
            formData.append('image', file);
            
            downloadURL = await uploadImage(formData);

            // 2. Update firestore document
            const userDocRef = doc(firestore, 'users', user.id);
            await updateDoc(userDocRef, { avatarUrl: downloadURL });

            // 3. Update auth user profile
            await updateProfile(auth.currentUser, { photoURL: downloadURL });

            toast({
                title: 'Success',
                description: 'Profile picture updated successfully.',
            });
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                 const permissionError = new FirestorePermissionError(
                    {
                        path: `users/${user.id}`,
                        operation: 'update',
                        requestResourceData: { avatarUrl: downloadURL },
                    },
                    { cause: error }
                );
                errorEmitter.emit('permission-error', permissionError);
            } else {
                 console.warn('Error updating profile picture:', error);
                 toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: error.message || 'Could not update your profile picture. Please try again.',
                });
            }
        } finally {
            setIsUploading(false);
        }
    };
    
    async function onPasswordChangeSubmit(data: PasswordFormValues) {
        if (!auth?.currentUser || !user?.email) return;

        setPasswordChangeLoading(true);
        setPasswordChangeError(null);

        const credential = EmailAuthProvider.credential(user.email, data.currentPassword);

        try {
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, data.newPassword);
            
            toast({
                title: 'Success',
                description: 'Your password has been changed successfully.',
            });
            passwordForm.reset();
        } catch (error: any) {
            console.warn('Password change error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setPasswordChangeError('The current password you entered is incorrect.');
            } else {
                setPasswordChangeError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setPasswordChangeLoading(false);
        }
    }


    if (userLoading || !mounted) {
        return null;
    }

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>Please sign in to view your profile.</p>
            </div>
        );
    }


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your account settings and preferences.</p>
                </div>
            </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="bg-orange-50 text-orange-600">
                                <UserIcon className="h-16 w-16" />
                            </AvatarFallback>
                        </Avatar>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            hidden
                            accept="image/png, image/jpeg, image/webp"
                        />
                        <Button onClick={handleAvatarClick} disabled={isUploading}>
                            {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? 'Uploading...' : 'Change Picture'}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Click to upload a new photo. (JPG, PNG, WEBP)
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8 md:col-span-2">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Information</CardTitle>
                            <CardDescription>This information is managed by your account.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label>Full Name</Label>
                                <Input value={user.name} readOnly disabled />
                            </div>
                             <div className="space-y-1">
                                <Label>Email Address</Label>
                                <Input value={user.email} readOnly disabled />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Update your password. Make sure it's a strong one.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Current Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirm New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {passwordChangeError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{passwordChangeError}</AlertDescription>
                                        </Alert>
                                    )}
                                    <Button type="submit" disabled={passwordChangeLoading}>
                                        {passwordChangeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Change Password
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>Select how you'd like the app to look.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={theme} onValueChange={setTheme} className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="light" id="theme-light" />
                                    <Label htmlFor="theme-light" className="font-normal">Light</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="dark" id="theme-dark" />
                                    <Label htmlFor="theme-dark" className="font-normal">Dark</Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}