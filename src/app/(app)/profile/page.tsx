'use client';

import { useState, useRef } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { PageLoader } from '@/components/shared/page-loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';


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
    const { auth, firestore, storage } = useFirebase();
    const { toast } = useToast();
    
    const [isUploading, setIsUploading] = useState(false);
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!file || !user || !storage || !firestore || !auth?.currentUser) return;

        setIsUploading(true);

        try {
            const storageRef = ref(storage, `avatars/${user.id}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);

            // Update firestore document
            const userDocRef = doc(firestore, 'users', user.id);
            await updateDoc(userDocRef, { avatarUrl: downloadURL });

            // Update auth user profile
            await updateProfile(auth.currentUser, { photoURL: downloadURL });

            toast({
                title: 'Success',
                description: 'Profile picture updated successfully.',
            });
            // The useUser hook will automatically reflect the change
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'Could not update your profile picture. Please try again.',
            });
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
            console.error('Password change error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setPasswordChangeError('The current password you entered is incorrect.');
            } else {
                setPasswordChangeError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setPasswordChangeLoading(false);
        }
    }


    if (userLoading) {
        return <PageLoader />;
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
        <Reveal>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your account settings and preferences.</p>
                </div>
            </div>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-3">
            <Reveal delay={0.1} className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Avatar className="w-32 h-32 text-4xl">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
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
            </Reveal>

            <div className="space-y-8 md:col-span-2">
                <Reveal delay={0.2}>
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
                </Reveal>

                <Reveal delay={0.3}>
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
                </Reveal>
            </div>
        </div>
    </div>
  );
}
