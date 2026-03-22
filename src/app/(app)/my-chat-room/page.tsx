
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import type { User, ChatMessage } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInterface } from '@/components/shared/chat-interface';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type ContactWithMetadata = User & {
    lastMessage?: string;
    lastTimestamp?: any;
};

const ContactItem = ({ 
    contact, 
    isSelected, 
    onSelect 
}: { 
    contact: ContactWithMetadata; 
    isSelected: boolean; 
    onSelect: () => void 
}) => {
    const isOnline = useOnlineStatus(contact.id);

    return (
        <button
            className={cn(
                'w-full text-left p-4 flex items-center gap-3 transition-all border-b last:border-b-0',
                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
            )}
            onClick={onSelect}
        >
            <div className="relative shrink-0">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" title="Online" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <p className="font-bold text-sm truncate">{contact.name}</p>
                    {contact.lastTimestamp && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {formatDistanceToNow(contact.lastTimestamp.toDate(), { addSuffix: false })}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">
                        {contact.lastMessage || (
                            <span className="italic opacity-70">Start a conversation</span>
                        )}
                    </p>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize opacity-60">
                        {contact.role === 'student' ? 'User' : contact.role}
                    </Badge>
                </div>
            </div>
        </button>
    );
};

export default function MyChatRoomPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [contacts, setContacts] = useState<ContactWithMetadata[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactWithMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'student' | 'teacher' | 'promoter'>('all');
    const [searchQuery, setSearchTerm] = useState('');

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const fetchContacts = async () => {
            try {
                const usersCol = collection(firestore, 'users');
                let fetchedContacts: User[] = [];

                if (user.role === 'admin') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    fetchedContacts = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                } else if (user.role === 'student') {
                    const qTeachers = query(usersCol, where('role', '==', 'teacher'));
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const [tSnap, aSnap] = await Promise.all([getDocs(qTeachers), getDocs(qAdmins)]);
                    fetchedContacts = [
                        ...tSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
                        ...aSnap.docs.map(d => ({ id: d.id, ...d.data() } as User))
                    ];
                } else if (user.role === 'teacher') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                    const teacherAssignments = user.assignedClasses || [];
                    fetchedContacts = allUsers.filter(u => {
                        if (u.role === 'admin') return true;
                        if (u.role !== 'student') return false;
                        if (u.referredBy === user.id) return true;
                        const studentContexts = [u.class, u.level, u.competitiveExam].filter(Boolean);
                        return studentContexts.some(ctx => teacherAssignments.includes(ctx!));
                    });
                } else if (user.role === 'promoter') {
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const aSnap = await getDocs(qAdmins);
                    fetchedContacts = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                }

                const cleaned = fetchedContacts.filter(c => c.id !== user.id);
                
                // Initialize contacts with basic data
                const initialContacts = cleaned.map(c => ({ ...c }));
                setContacts(initialContacts);
                setLoading(false);

                // Listen for last messages for each contact to handle sorting
                cleaned.forEach(contact => {
                    const chatId = [user.id, contact.id].sort().join('_');
                    const lastMsgQuery = query(
                        collection(firestore, 'chats', chatId, 'messages'),
                        orderBy('timestamp', 'desc'),
                        limit(1)
                    );

                    onSnapshot(lastMsgQuery, (snap) => {
                        if (!snap.empty) {
                            const lastMsg = snap.docs[0].data() as ChatMessage;
                            setContacts(prev => {
                                const updated = prev.map(c => 
                                    c.id === contact.id 
                                        ? { ...c, lastMessage: lastMsg.text, lastTimestamp: lastMsg.timestamp } 
                                        : c
                                );
                                // Sort by timestamp desc
                                return updated.sort((a, b) => {
                                    const timeA = a.lastTimestamp?.toMillis() || 0;
                                    const timeB = b.lastTimestamp?.toMillis() || 0;
                                    if (timeA !== timeB) return timeB - timeA;
                                    return a.name.localeCompare(b.name);
                                });
                            });
                        }
                    });
                });

            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: 'users',
                        operation: 'list',
                    }, { cause: err }));
                }
                setLoading(false);
            }
        };

        fetchContacts();
    }, [firestore, user]);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const matchesRole = filter === 'all' || c.role === filter;
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [contacts, filter, searchQuery]);

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-2rem)] overflow-hidden bg-background border rounded-xl shadow-2xl">
            <div className="flex h-full divide-x">
                {/* Contacts Sidebar */}
                <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-full bg-card shrink-0">
                    <div className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold font-headline">Messages</h2>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search chats..." 
                                className="pl-9 h-10 bg-muted/50 border-none rounded-full"
                                value={searchQuery}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'student', label: 'Users' },
                                { id: 'teacher', label: 'Teachers' },
                                { id: 'promoter', label: 'Promoters' }
                            ].map(item => (
                                <Button
                                    key={item.id}
                                    variant={filter === item.id ? 'default' : 'secondary'}
                                    size="sm"
                                    className="rounded-full h-7 px-4 text-xs font-semibold shrink-0"
                                    onClick={() => setFilter(item.id as any)}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredContacts.length > 0 ? (
                            <ScrollArea className="h-full">
                                <div className="flex flex-col">
                                    {filteredContacts.map(contact => (
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
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                <Filter className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm">No conversations found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Main Area */}
                <div className={cn(
                    "flex-1 flex flex-col h-full bg-muted/20 relative transition-transform duration-300",
                    !selectedContact && "hidden md:flex items-center justify-center"
                )}>
                    {user && selectedContact ? (
                        <div className="flex flex-col h-full w-full">
                            {/* Mobile Back Button Overlay */}
                            <div className="md:hidden absolute top-4 left-4 z-50">
                                <Button variant="secondary" size="sm" className="rounded-full shadow-lg" onClick={() => setSelectedContact(null)}>
                                    Back
                                </Button>
                            </div>
                            <ChatInterface currentUser={user} chatPartner={selectedContact} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <Loader2 className="h-10 w-10 text-primary opacity-20" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-headline">WhatsApp-style Messaging</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Select a contact from the list to start a secure, real-time conversation.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
