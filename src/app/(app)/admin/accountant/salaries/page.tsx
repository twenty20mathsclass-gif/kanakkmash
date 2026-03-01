
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, University, Hash, Landmark, User as UserIcon } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AccountantSalariesPage() {
    const { firestore } = useFirebase();
    const [teachers, setTeachers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchTeachers = async () => {
            setLoading(true);
            try {
                const q = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
                const querySnapshot = await getDocs(q);
                const teachersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setTeachers(teachersList);
            } catch (serverError: any) {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error("Error fetching teachers: ", serverError);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, [firestore]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Teacher Salaries</h1>
                    <p className="text-muted-foreground">Manage and process salary payments for teachers.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : teachers.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {teachers.map(teacher => (
                        <Card key={teacher.id}>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <CardTitle>{teacher.name}</CardTitle>
                                    <CardDescription>{teacher.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {teacher.accountHolderName ? (
                                    <div className="space-y-3 rounded-md border p-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.accountHolderName}</span>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.bankName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Hash className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.accountNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <University className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.ifscCode}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg">
                                        <p>Bank details not provided.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No teachers found in the system.</p>
                </div>
            )}
        </div>
    );
}
