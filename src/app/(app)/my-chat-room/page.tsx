
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import type { User, Schedule } from '@/lib/definitions';
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

    const contactListTitle = user?.role === 'student' ? 'My Teachers' : user?.role === 'teacher' ? 'My Students' : 'My Contacts';

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const fetchContacts = async () => {
            try {
                if (user.role === 'student') {
                    // A student's contacts are their teachers from their schedules, plus their referrer.
                    const schedulesQuery = query(collection(firestore, 'schedules'));
                    const schedulesSnapshot = await getDocs(schedulesQuery);
                    const allSchedules = schedulesSnapshot.docs.map(doc => doc.data() as Schedule);
                    
                    const studentSchedules = allSchedules.filter(schedule => {
                        // Personal schedule check
                        if (schedule.studentId === user.id) {
                          return true;
                        }

                        // Group schedule check
                        if (!schedule.studentId && schedule.courseModel === user.courseModel) {
                            if (user.courseModel === 'COMPETITIVE EXAM') {
                                return schedule.competitiveExam === user.competitiveExam;
                            }

                            if (schedule.class === user.class) {
                                if (user.class !== 'DEGREE') {
                                    return schedule.syllabus === user.syllabus;
                                }
                                return true;
                            }
                        }
                        
                        return false;
                    });
                    
                    const teacherIds = [...new Set(studentSchedules.map(s => s.teacherId))];
                    if (user.referredBy && !teacherIds.includes(user.referredBy)) {
                        teacherIds.push(user.referredBy);
                    }

                    if (teacherIds.length > 0) {
                        const teacherPromises = teacherIds.map(id => getDoc(doc(firestore, 'users', id)));
                        const teacherSnaps = await Promise.all(teacherPromises);
                        const teacherContacts = teacherSnaps
                            .filter(snap => snap.exists() && snap.data().role === 'teacher')
                            .map(snap => ({ id: snap.id, ...snap.data() } as User));
                        setContacts(teacherContacts);
                    } else {
                        setContacts([]);
                    }
                } else if (user.role === 'teacher') {
                    // A teacher's contacts are any student they have referred or any student who has attended one of their classes.
                    const studentIdSet = new Set<string>();

                    // 1. Get students from referrals
                    const referralsQuery = query(collection(firestore, 'users', user.id, 'referrals'));
                    const referralsSnapshot = await getDocs(referralsQuery);
                    referralsSnapshot.docs.forEach(doc => studentIdSet.add(doc.id));
                    
                    // 2. Get students from schedule attendees
                    const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', user.id));
                    const schedulesSnapshot = await getDocs(schedulesQuery);
                    
                    const attendeePromises = schedulesSnapshot.docs.map(scheduleDoc => {
                        const attendeesQuery = query(collection(firestore, 'schedules', scheduleDoc.id, 'attendees'));
                        return getDocs(attendeesQuery);
                    });
                    
                    const attendeeSnapshots = await Promise.all(attendeePromises);
                    
                    attendeeSnapshots.forEach(attendeeSnapshot => {
                        attendeeSnapshot.docs.forEach(attendeeDoc => {
                            studentIdSet.add(attendeeDoc.id);
                        });
                    });


                    const allStudentIds = Array.from(studentIdSet);

                    if (allStudentIds.length > 0) {
                        // Fetch each user document individually because of security rules
                        const studentPromises = allStudentIds.map(id => getDoc(doc(firestore, 'users', id)));
                        const studentSnaps = await Promise.all(studentPromises);
                        
                        const studentContacts = studentSnaps
                            .filter(snap => snap.exists())
                            .map(snap => ({ id: snap.id, ...snap.data() } as User));
                            
                        studentContacts.sort((a, b) => a.name.localeCompare(b.name));
                        setContacts(studentContacts);
                    } else {
                        setContacts([]);
                    }
                }
            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'referrals, schedules, attendees, or users',
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
                                <p>No contacts found. Your teachers or students will appear here once classes are scheduled.</p>
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
