
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User, ChatMessage, ChatGroup } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Filter, ArrowLeft, Plus, Users as UsersIcon } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

type ContactWithMetadata = (User | ChatGroup) & {
    lastMessage?: string;
    lastTimestamp?: any;
    hasUnread?: boolean;
    isGroup?: boolean;
};

const ContactItem = ({ 
    contact, 
    isSelected, 
    onSelect,
    currentUserId
}: { 
    contact: ContactWithMetadata; 
    isSelected: boolean; 
    onSelect: () => void;
    currentUserId: string;
}) => {
    const isOnline = contact.isGroup ? false : useOnlineStatus((contact as User).id);

    const getSubtitle = () => {
        if (contact.isGroup) return 'Group Chat';
        const user = contact as User;
        if (user.role === 'student') {
            const parts = [];
            if (user.class) parts.push(user.class);
            if (user.level) parts.push(user.level);
            if (user.competitiveExam) parts.push(user.competitiveExam);
            return parts.length > 0 ? parts.join(' - ') : 'Student';
        }
        if (user.role === 'teacher') {
            return user.assignedClasses && user.assignedClasses.length > 0 
                ? `Assigned: ${user.assignedClasses.join(', ')}` 
                : 'Teacher';
        }
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    };

    return (
        <button
            className={cn(
                'w-full text-left p-4 flex items-center gap-3 transition-all border-b last:border-b-0',
                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                contact.hasUnread && !isSelected && 'bg-primary/5'
            )}
            onClick={onSelect}
        >
            <div className="relative shrink-0">
                <Avatar className={cn(
                    "h-12 w-12 border-2 border-background shadow-sm",
                    contact.isGroup && "rounded-lg"
                )}>
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" title="Online" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <p className={cn("text-sm truncate", contact.hasUnread && !isSelected ? "font-black" : "font-bold")}>{contact.name}</p>
                        {contact.hasUnread && !isSelected && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                    </div>
                    {contact.lastTimestamp && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {formatDistanceToNow(contact.lastTimestamp.toDate(), { addSuffix: false })}
                        </span>
                    )}
                </div>
                <div className="mb-1">
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
                        {getSubtitle()}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <p className={cn("text-xs truncate", contact.hasUnread && !isSelected ? "text-foreground font-semibold" : "text-muted-foreground")}>
                        {contact.lastMessage || (
                            <span className="italic opacity-70">Start a conversation</span>
                        )}
                    </p>
                    {contact.isGroup && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 uppercase opacity-60">Group</Badge>}
                </div>
            </div>
        </button>
    );
};

function CreateGroupDialog({ 
    students, 
    currentUserId, 
    onCreate 
}: { 
    students: User[]; 
    currentUserId: string; 
    onCreate: (name: string, members: string[]) => Promise<void>; 
}) {
    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim() || selectedMembers.length === 0) return;
        setLoading(true);
        try {
            await onCreate(name, selectedMembers);
            setIsOpen(false);
            setName('');
            setSelectedMembers([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New Group
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create Group</DialogTitle>
                    <DialogDescription>Create a group with your students. Admins will be added automatically.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 flex-grow flex flex-col min-h-0">
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Group Name</Label>
                        <Input 
                            id="group-name" 
                            placeholder="e.g. Class 10 - Maths Morning" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 flex-grow flex flex-col min-h-0">
                        <Label>Select Students ({selectedMembers.length})</Label>
                        <ScrollArea className="flex-1 border rounded-md p-2">
                            <div className="space-y-3">
                                {students.map(student => (
                                    <div key={student.id} className="flex items-center space-x-3">
                                        <Checkbox 
                                            id={`member-${student.id}`} 
                                            checked={selectedMembers.includes(student.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedMembers(prev => 
                                                    checked 
                                                        ? [...prev, student.id] 
                                                        : prev.filter(id => id !== student.id)
                                                );
                                            }}
                                        />
                                        <label 
                                            htmlFor={`member-${student.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={student.avatarUrl} />
                                                <AvatarFallback>{student.name[0]}</AvatarFallback>
                                            </Avatar>
                                            {student.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading || !name.trim() || selectedMembers.length === 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Group
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MyChatRoomPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [contacts, setContacts] = useState<ContactWithMetadata[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactWithMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'student' | 'teacher' | 'promoter' | 'admin' | 'group'>('all');
    const [searchQuery, setSearchTerm] = useState('');

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const fetchAll = async () => {
            try {
                // 1. Fetch Users
                const usersCol = collection(firestore, 'users');
                let fetchedUsers: User[] = [];

                if (user.role === 'admin') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    fetchedUsers = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                } else if (user.role === 'student') {
                    const qTeachers = query(usersCol, where('role', '==', 'teacher'));
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const [tSnap, aSnap] = await Promise.all([getDocs(qTeachers), getDocs(qAdmins)]);
                    fetchedUsers = [
                        ...tSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
                        ...aSnap.docs.map(d => ({ id: d.id, ...d.data() } as User))
                    ];
                } else if (user.role === 'teacher') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                    const teacherAssignments = user.assignedClasses || [];
                    fetchedUsers = allUsers.filter(u => {
                        if (u.role === 'admin') return true;
                        if (u.role !== 'student') return false;
                        if (u.referredBy === user.id) return true;
                        const studentContexts = [u.class, u.level, u.competitiveExam].filter(Boolean);
                        return studentContexts.some(ctx => teacherAssignments.includes(ctx!));
                    });
                } else if (user.role === 'promoter') {
                    const qAdmins = query(usersCol, where('role', '==', 'admin'));
                    const aSnap = await getDocs(qAdmins);
                    fetchedUsers = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                }

                // 2. Fetch Groups where user is a member
                const groupsQuery = query(collection(firestore, 'groups'), where('members', 'array-contains', user.id));
                const groupsSnap = await getDocs(groupsQuery);
                const fetchedGroups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChatGroup));

                const combined: ContactWithMetadata[] = [
                    ...fetchedUsers.filter(u => u.id !== user.id).map(u => ({ ...u, isGroup: false } as ContactWithMetadata)),
                    ...fetchedGroups.map(g => ({ ...g, isGroup: true } as ContactWithMetadata))
                ];

                setContacts(combined);
                setLoading(false);

                // 3. Listen for last messages and unread markers
                combined.forEach(contact => {
                    const chatId = contact.isGroup ? contact.id : [user.id, (contact as User).id].sort().join('_');
                    const collName = contact.isGroup ? 'groups' : 'chats';
                    
                    const lastMsgQuery = query(
                        collection(firestore, collName, chatId, 'messages'),
                        orderBy('timestamp', 'desc'),
                        limit(1)
                    );

                    onSnapshot(lastMsgQuery, (snap) => {
                        if (!snap.empty) {
                            const lastMsg = snap.docs[0].data() as ChatMessage;
                            setContacts(prev => {
                                const updated = prev.map(c => {
                                    const cId = c.isGroup ? c.id : (c as User).id;
                                    const targetId = contact.isGroup ? contact.id : (contact as User).id;
                                    if (cId === targetId) {
                                        return {
                                            ...c,
                                            lastMessage: lastMsg.text,
                                            lastTimestamp: lastMsg.timestamp,
                                            hasUnread: lastMsg.senderId !== user.id && !lastMsg.isRead
                                        };
                                    }
                                    return c;
                                });
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
                console.error(err);
                setLoading(false);
            }
        };

        fetchAll();
    }, [firestore, user]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedContact) {
                setSelectedContact(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedContact]);

    const handleCreateGroup = async (name: string, members: string[]) => {
        if (!firestore || !user) return;
        
        try {
            // Find all admins to add them to the group automatically
            const adminsQuery = query(collection(firestore, 'users'), where('role', '==', 'admin'));
            const adminsSnap = await getDocs(adminsQuery);
            const adminIds = adminsSnap.docs.map(d => d.id);
            
            // Deduplicate all participants
            const allMembers = Array.from(new Set([...members, user.id, ...adminIds]));
            const groupAdmins = Array.from(new Set([user.id, ...adminIds]));

            const groupData: Omit<ChatGroup, 'id'> = {
                name,
                members: allMembers,
                admins: groupAdmins,
                createdBy: user.id,
                createdAt: serverTimestamp() as any,
                isGroup: true,
                avatarUrl: `https://picsum.photos/seed/${name.length}/200`
            };

            const docRef = await addDoc(collection(firestore, 'groups'), groupData);
            const newGroup = { id: docRef.id, ...groupData } as ContactWithMetadata;
            
            setContacts(prev => [newGroup, ...prev]);
            setSelectedContact(newGroup);
            toast({ title: 'Group Created', description: `"${name}" is ready for chat.` });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
        }
    };

    const filterOptions = useMemo(() => {
        if (!user) return [];
        const options = [{ id: 'all', label: 'All' }];
        if (user.role === 'admin') {
            options.push({ id: 'student', label: 'Students' });
            options.push({ id: 'teacher', label: 'Teachers' });
            options.push({ id: 'group', label: 'Groups' });
        } else if (user.role === 'teacher') {
            options.push({ id: 'student', label: 'Students' });
            options.push({ id: 'group', label: 'Groups' });
            options.push({ id: 'admin', label: 'Admin' });
        } else {
            options.push({ id: 'group', label: 'Groups' });
            options.push({ id: 'admin', label: 'Admin' });
        }
        return options;
    }, [user]);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const matchesRole = filter === 'all' 
                ? true 
                : filter === 'group' ? c.isGroup : (c as User).role === filter;
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [contacts, filter, searchQuery]);

    const availableStudents = useMemo(() => {
        return (contacts.filter(c => !c.isGroup && (c as User).role === 'student') as User[]);
    }, [contacts]);

    return (
        <div className="flex flex-col h-[calc(100svh-12rem)] md:h-[calc(100vh-theme(spacing.16)-4rem)] overflow-hidden bg-background border rounded-xl shadow-2xl relative">
            <div className="flex h-full divide-x">
                {/* Contacts Sidebar */}
                <div className={cn(
                    "w-full md:w-[350px] lg:w-[400px] flex flex-col h-full bg-card shrink-0",
                    selectedContact && "hidden md:flex"
                )}>
                    <div className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold font-headline">Messages</h2>
                            {user?.role === 'teacher' && (
                                <CreateGroupDialog 
                                    students={availableStudents} 
                                    currentUserId={user.id} 
                                    onCreate={handleCreateGroup} 
                                />
                            )}
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
                            {filterOptions.map(item => (
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
                                            currentUserId={user!.id}
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
                    "flex-1 flex flex-col h-full bg-muted/20 relative transition-all duration-300",
                    !selectedContact && "hidden md:flex items-center justify-center"
                )}>
                    {user && selectedContact ? (
                        <div className="flex flex-col h-full w-full">
                            <div className="md:hidden absolute top-3.5 left-4 z-50">
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-background/50 backdrop-blur-md" onClick={() => setSelectedContact(null)}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </div>
                            <ChatInterface 
                                currentUser={user} 
                                chatPartner={selectedContact as any} 
                                isGroup={selectedContact.isGroup} 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <UsersIcon className="h-10 w-10 text-primary opacity-20" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-headline">Select a conversation</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Connect with students, teachers, or groups to start learning together.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
