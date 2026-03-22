
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import type { User } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInterface } from '@/components/shared/chat-interface';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';

export const dynamic = 'force-dynamic';

const ContactItem = ({ contact, isSelected, onSelect }: { contact: User; isSelected: boolean; onSelect: () => void }) => {
    const isOnline = useOnlineStatus(contact.id);

    return (
        <button
            className={cn(
                'w-full text-left p-3 rounded-lg border flex items-center gap-3 transition-colors',
                isSelected ? 'bg-accent border-primary ring-1 ring-primary' : 'hover:bg-accent/50'
            )}
            onClick={onSelect}
        >
            <div className="relative">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" title="Online" />
                )}
            </div>
            <div>
                <p className="font-semibold">{contact.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{contact.role}</p>
            </div>
        </button>
    );
};


export default function MyChatRoomPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [contacts, setContacts] = useState<User[]>([]);
    const [selectedContact, setSelectedContact] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [contactListTitle, setContactListTitle] = useState('My Contacts');
    
    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const fetchContacts = async () => {
            try {
                let fetchedContacts: User[] = [];
                const usersCol = collection(firestore, 'users');

                if (user.role === 'student') {
                    setContactListTitle('My Teachers');
                    // Students see all teachers and admins
                    const qTeachers = query(usersCol, where('role', '==', 'teacher'));
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    
                    const [teachersSnap, adminsSnap] = await Promise.all([
                        getDocs(qTeachers),
                        getDocs(qAdmins)
                    ]);
                    
                    fetchedContacts = [
                        ...teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)),
                        ...adminsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
                    ];

                } else if (user.role === 'teacher') {
                    setContactListTitle('My Students');
                    
                    const contactMap = new Map<string, User>();

                    // 1. Fetch Admins (always visible to teachers)
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const adminsSnap = await getDocs(qAdmins);
                    adminsSnap.forEach(doc => contactMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

                    // 2. Fetch Assigned Students (Groups)
                    if (user.assignedClasses && user.assignedClasses.length > 0) {
                        const assignedItems = user.assignedClasses;
                        
                        // Firestore 'in' queries are limited to 30 items
                        const chunks = [];
                        for (let i = 0; i < assignedItems.length; i += 30) {
                            chunks.push(assignedItems.slice(i, i + 30));
                        }

                        const studentPromises = chunks.flatMap(chunk => [
                            getDocs(query(usersCol, where('role', '==', 'student'), where('class', 'in', chunk))),
                            getDocs(query(usersCol, where('role', '==', 'student'), where('level', 'in', chunk))),
                            getDocs(query(usersCol, where('role', '==', 'student'), where('competitiveExam', 'in', chunk)))
                        ]);

                        const studentSnaps = await Promise.all(studentPromises);
                        studentSnaps.forEach(snap => {
                            snap.forEach(doc => {
                                const s = { id: doc.id, ...doc.data() } as User;
                                // Only show group students if teacher is assigned to that class
                                if (s.learningMode === 'group') {
                                    contactMap.set(doc.id, s);
                                }
                            });
                        });
                    }

                    // 3. Fetch Referred/Personal Students (One to One)
                    // If a student was referred by this teacher, they are connected (usually 1-1)
                    const qReferred = query(usersCol, where('referredBy', '==', user.id));
                    const referredSnap = await getDocs(qReferred);
                    referredSnap.forEach(doc => contactMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

                    fetchedContacts = Array.from(contactMap.values());

                } else if (user.role === 'admin') {
                    setContactListTitle('All Users');
                    // Admins see everyone
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    fetchedContacts = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                } else if (user.role === 'promoter') {
                    setContactListTitle('Support');
                    // Promoters see admins
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const adminsSnap = await getDocs(qAdmins);
                    fetchedContacts = adminsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                }

                // Filter out self and sort
                const finalContacts = fetchedContacts
                    .filter(c => c.id !== user.id)
                    .sort((a, b) => a.name.localeCompare(b.name));

                setContacts(finalContacts);

            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'users',
                        operation: 'list',
                    }, { cause: err });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.warn("Error fetching contacts:", err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [firestore, user]);

    return (
        <div className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-4">
                <Card className="md:col-span-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="font-headline">{contactListTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : contacts.length > 0 ? (
                            <ScrollArea className="h-full">
                                <div className="space-y-2 pr-4">
                                {contacts.map(contact => (
                                    <ContactItem 
                                        key={contact.id}
                                        contact={contact}
                                        isSelected={selectedContact?.id === contact.id}
                                        onSelect={() => setSelectedContact(contact)}
                                    />
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex justify-center items-center h-full text-center text-muted-foreground p-4">
                                <p>No contacts found.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="md:col-span-2 h-full">
                    {user && selectedContact ? (
                        <ChatInterface currentUser={user} chatPartner={selectedContact} />
                    ) : (
                        <Card className="flex flex-col items-center justify-center h-full border-2 border-dashed">
                             <p className="text-muted-foreground">Select a contact to start chatting</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
