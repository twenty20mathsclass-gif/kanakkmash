'use client';

import { useState } from 'react';
import type { User } from '@/lib/definitions';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Loader2, MoreHorizontal } from 'lucide-react';
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

interface UsersTableProps {
  users: User[];
  onUserChanged: () => void;
}


export function UsersTable({ users, onUserChanged }: UsersTableProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();

    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
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
        } catch (error) {
            console.error("Error deleting user:", error);
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
                    'secondary'
                }>
                    {user.role}
                </Badge>
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
                    <DropdownMenuItem onClick={() => setUserToEdit(user)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-destructive">Delete</DropdownMenuItem>
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
