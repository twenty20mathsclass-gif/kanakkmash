
'use client';

import { useState } from 'react';
import type { User } from '@/lib/definitions';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
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
import { Loader2, MoreHorizontal, IndianRupee, Mail, User as UserIcon, Edit } from 'lucide-react';
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
import { sendPasswordResetEmail } from 'firebase/auth';
import { EditUserDialog } from './edit-user-dialog';


interface UsersTableProps {
  users: User[];
  onUserUpdated: () => void;
}

export function UsersTable({ users, onUserUpdated }: UsersTableProps) {
    const { toast } = useToast();
    const { auth } = useFirebase();

    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
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

    const openEditDialog = (user: User) => {
        setUserToEdit(user);
        setIsEditDialogOpen(true);
    };
  
  return (
    <>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell"><span className="sr-only">Avatar</span></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden lg:table-cell">Info</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
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
                    <TableCell className="font-medium">
                        {user.name}
                        <div className="text-muted-foreground text-xs md:hidden">{user.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell>
                    <Badge variant={
                        user.role === 'admin' ? 'destructive' : 
                        user.role === 'teacher' ? 'default' : 
                        user.role === 'promoter' ? 'outline' :
                        'secondary'
                    } className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                        {user.role === 'teacher' ? (
                            <div className="space-y-1">
                                {(user.hourlyRateGroup || user.hourlyRate) ? (
                                    <div className="flex items-center gap-1 text-[10px]"><Badge variant="outline" className="px-1 py-0 h-auto text-[9px]">G</Badge><IndianRupee className="h-3 w-3" />{(user.hourlyRateGroup || user.hourlyRate)?.toLocaleString('en-IN')}/hr</div>
                                ) : null}
                                {(user.hourlyRateOneToOne || user.hourlyRate) ? (
                                    <div className="flex items-center gap-1 text-[10px]"><Badge variant="outline" className="px-1 py-0 h-auto text-[9px]">1-1</Badge><IndianRupee className="h-3 w-3" />{(user.hourlyRateOneToOne || user.hourlyRate)?.toLocaleString('en-IN')}/hr</div>
                                ) : null}
                                {!(user.hourlyRateGroup || user.hourlyRateOneToOne || user.hourlyRate) && <span className="text-muted-foreground">-</span>}
                            </div>
                        ) : user.role === 'promoter' && user.rewardPercentage ? (
                            <div className="flex items-center gap-1 text-sm">{user.rewardPercentage}% Reward</div>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/admin/users/${user.id}`}><UserIcon className="mr-2 h-4 w-4"/>View Profile</Link></DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditDialog(user)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTimeout(() => setUserToReset(user), 0)}><Mail className="mr-2 h-4 w-4" />Send Password Reset</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
        
        <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
                    <AlertDialogDescription>This will send a password reset link to {userToReset?.name} at <strong>{userToReset?.email}</strong>.</AlertDialogDescription>
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
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onUserUpdated={() => {
                    setIsEditDialogOpen(false);
                    onUserUpdated();
                }}
            />
        )}
    </>
  );
}
