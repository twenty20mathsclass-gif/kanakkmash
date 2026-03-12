
'use client';

import { useState } from 'react';
import type { User } from '@/lib/definitions';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Loader2, MoreHorizontal, IndianRupee, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from '../ui/alert-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UsersTableProps {
  users: User[];
  onUserChanged: () => void;
}


export function UsersTable({ users, onUserChanged }: UsersTableProps) {
    const { toast } = useToast();
    const { auth, firestore } = useFirebase();

    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    
    const handleDeleteUser = async () => {
        if (!userToDelete || !firestore) return;
        
        setIsDeleting(true);
        const userDocRef = doc(firestore, 'users', userToDelete.id);
        
        try {
            await deleteDoc(userDocRef);
            toast({
                title: 'User Deleted',
                description: `${userToDelete.name} has been removed from the system.`,
            });
            onUserChanged();
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'delete',
                }, { cause: error });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("Error deleting user:", error);
            }
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to delete ${userToDelete.name}.`,
            });
        } finally {
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    const handleSendResetEmail = async () => {
        if (!userToReset || !auth) return;
        
        setIsResetting(true);
        
        try {
            await sendPasswordResetEmail(auth, userToReset.email);
            toast({
                title: 'Email Sent',
                description: `A password reset email has been sent to ${userToReset.name}.`,
            });
        } catch (error: any) {
            console.error("Error sending password reset email:", error);
            toast({
                variant: 'destructive',
                title: 'Error sending reset email',
                description: error.message || `Failed to send email to ${userToReset.name}.`,
            });
        } finally {
            setIsResetting(false);
            setUserToReset(null);
        }
    };
  
  return (
    <>
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Avatar</span>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Hourly Rate / Reward %</TableHead>
            <TableHead>
                <span className="sr-only">Actions</span>
            </TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {users.map((user) => (
            <TableRow key={user.id}>
                <TableCell className="hidden sm:table-cell">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                <Badge variant={
                    user.role === 'admin' ? 'destructive' : 
                    user.role === 'teacher' ? 'default' : 
                    user.role === 'promoter' ? 'outline' :
                    'secondary'
                }>
                    {user.role}
                </Badge>
                </TableCell>
                <TableCell>
                    {user.role === 'teacher' && user.hourlyRate ? (
                        <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {user.hourlyRate.toLocaleString('en-IN')}
                        </div>
                    ) : user.role === 'promoter' && user.rewardPercentage ? (
                        <div className="flex items-center gap-1">
                            {user.rewardPercentage}%
                        </div>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </TableCell>
                <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setTimeout(() => setUserToEdit(user), 0)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setTimeout(() => setUserToReset(user), 0)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Password Reset
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setTimeout(() => setUserToDelete(user), 0)} className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {userToDelete?.name}'s account
                        and remove their data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will send a password reset link to {userToReset?.name} at <strong>{userToReset?.email}</strong>. The user will be able to set a new password themselves.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSendResetEmail} disabled={isResetting}>
                         {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Send Email
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {userToEdit && (
            <EditUserDialog 
                user={userToEdit}
                isOpen={!!userToEdit}
                onOpenChange={(open) => !open && setUserToEdit(null)}
                onUserUpdated={onUserChanged}
            />
        )}
    </>
  );
}
