
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
                    // Fetch all schedules and all teachers
                    const [schedulesSnapshot, teachersSnapshot] = await Promise.all([
                        getDocs(collection(firestore, 'schedules')),
                        getDocs(query(collection(firestore, 'users'), where('role', '==', 'teacher')))
                    ]);
                    
                    const allSchedules = schedulesSnapshot.docs.map(doc => doc.data() as Schedule);
                    const allTeachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

                    // Filter schedules relevant to the student
                    const relevantSchedules = allSchedules.filter(schedule => {
                        if (schedule.studentId === user.id) return true;
                        if (schedule.courseModel !== user.courseModel || schedule.studentId) return false;

                        if (user.courseModel === 'COMPETITIVE EXAM') {
                            return schedule.competitiveExam === user.competitiveExam;
                        } else {
                            return schedule.class === user.class && (user.class === 'DEGREE' || schedule.syllabus === user.syllabus);
                        }
                    });

                    const teacherIds = new Set(relevantSchedules.map(s => s.teacherId));
                    const studentContacts = allTeachers.filter(teacher => teacherIds.has(teacher.id));
                    setContacts(studentContacts);

                } else if (user.role === 'teacher') {
                    // Fetch all schedules by this teacher and all students
                     const [schedulesSnapshot, studentsSnapshot] = await Promise.all([
                        getDocs(query(collection(firestore, 'schedules'), where('teacherId', '==', user.id))),
                        getDocs(query(collection(firestore, 'users'), where('role', '==', 'student')))
                    ]);

                    const teacherSchedules = schedulesSnapshot.docs.map(doc => doc.data() as Schedule);
                    const allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                    
                    const studentIds = new Set<string>();
                    teacherSchedules.forEach(schedule => {
                        if (schedule.studentId) {
                            studentIds.add(schedule.studentId);
                        } else {
                            // For group classes, find all matching students
                            allStudents.forEach(student => {
                                if (schedule.courseModel !== student.courseModel) return;
    
                                if (student.courseModel === 'COMPETITIVE EXAM') {
                                    if (schedule.competitiveExam === student.competitiveExam) {
                                        studentIds.add(student.id);
                                    }
                                } else {
                                    if (schedule.class === student.class && (student.class === 'DEGREE' || schedule.syllabus === student.syllabus)) {
                                        studentIds.add(student.id);
                                    }
                                }
                            });
                        }
                    });

                    const teacherContacts = allStudents.filter(student => studentIds.has(student.id));
                    setContacts(teacherContacts);
                }
            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'schedules or users',
                        operation: 'list',
                    }, { cause: err });
                    errorEmitter.emit('permission-error', permissionError);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [firestore, user]);

    return (
        <div className="h-[calc(100vh-14rem)] md:h-[calc(100vh-13rem)]">
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
