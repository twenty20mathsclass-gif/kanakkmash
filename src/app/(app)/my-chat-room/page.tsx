'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, addDoc, serverTimestamp, Unsubscribe, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, ChatMessage, ChatGroup } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Filter, ArrowLeft, Plus, Users as UsersIcon, Info, Edit, Trash2, X, MoreVertical, User as UserIcon, Calendar, Check, MessagesSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInterface } from '@/components/shared/chat-interface';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { formatDistanceToNow, format } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
    // Hook must be called unconditionally at the top level
    const isOnline = useOnlineStatus(contact.isGroup ? null : (contact as User).id);

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
                'w-full text-left p-4 flex items-center gap-3 transition-all border-b last:border-b-0 outline-none',
                isSelected ? 'bg-primary/15' : 'hover:bg-muted/50',
                contact.hasUnread && !isSelected && 'bg-primary/5'
            )}
            onClick={onSelect}
        >
            <div className="relative shrink-0">
                <Avatar className={cn(
                    "h-12 w-12 border-2 border-background shadow-md",
                    contact.isGroup ? "rounded-xl" : "rounded-full"
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
                        <p className={cn("text-sm truncate font-bold", contact.hasUnread && !isSelected ? "text-primary" : "text-foreground")}>{contact.name}</p>
                        {contact.hasUnread && !isSelected && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                    </div>
                    {contact.lastTimestamp && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 font-medium">
                            {formatDistanceToNow(contact.lastTimestamp.toDate(), { addSuffix: false })}
                        </span>
                    )}
                </div>
                <div className="mb-1">
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter font-black">
                        {getSubtitle()}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <p className={cn("text-xs truncate", contact.hasUnread && !isSelected ? "text-foreground font-semibold" : "text-muted-foreground/80")}>
                        {contact.lastMessage || (
                            <span className="italic opacity-50">Start a conversation</span>
                        )}
                    </p>
                    {contact.isGroup && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 uppercase opacity-60 font-black">Group</Badge>}
                </div>
            </div>
        </button>
    );
};

function GroupFormDialog({ 
    availableMembers, 
    onConfirm,
    initialData,
    trigger
}: { 
    availableMembers: User[]; 
    onConfirm: (name: string, members: string[]) => Promise<void>;
    initialData?: { name: string, members: string[] };
    trigger: React.ReactNode;
}) {
    const [name, setName] = useState(initialData?.name || '');
    const [selectedMembers, setSelectedMembers] = useState<string[]>(initialData?.members || []);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const handleConfirm = async () => {
        if (!name.trim() || selectedMembers.length === 0) return;
        setLoading(true);
        try {
            await onConfirm(name, selectedMembers);
            setIsOpen(false);
            if (!initialData) {
                setName('');
                setSelectedMembers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = useMemo(() => {
        return availableMembers.filter(m => 
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.class && m.class.toLowerCase().includes(search.toLowerCase())) ||
            (m.level && m.level.toLowerCase().includes(search.toLowerCase()))
        );
    }, [availableMembers, search]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-br from-primary/10 to-accent/10">
                    <DialogTitle className="text-2xl font-black font-headline tracking-tighter">
                        {initialData ? 'Edit Group' : 'Create Group'}
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                        {initialData ? 'Update group details and members.' : 'Build a learning community. Admins join automatically.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col p-6 pt-2 space-y-6 min-h-0 bg-background">
                    <div className="space-y-2">
                        <Label htmlFor="group-name" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Group Name</Label>
                        <Input 
                            id="group-name" 
                            placeholder="e.g. Class 10 - Maths Morning" 
                            value={name}
                            className="h-12 text-lg font-bold border-muted-foreground/20 focus:border-primary transition-all"
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-3 flex-grow flex flex-col min-h-0">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Members ({selectedMembers.length})</Label>
                            {selectedMembers.length > 0 && (
                                <button onClick={() => setSelectedMembers([])} className="text-[10px] text-primary hover:underline font-bold uppercase">Clear All</button>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Filter by name, class, or level..." 
                                className="pl-9 h-10 bg-muted/50 border-none text-xs rounded-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="flex-1 border-2 border-muted rounded-2xl p-2 bg-muted/20">
                            <div className="space-y-1">
                                {filteredMembers.map(member => {
                                    const isSelected = selectedMembers.includes(member.id);
                                    const studentInfo = member.role === 'student' ? (member.class || member.level || 'General') : 'Teacher';
                                    
                                    return (
                                        <div 
                                            key={member.id} 
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]",
                                                isSelected ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted"
                                            )}
                                            onClick={() => {
                                                setSelectedMembers(prev => 
                                                    isSelected 
                                                        ? prev.filter(id => id !== member.id) 
                                                        : [...prev, member.id]
                                                );
                                            }}
                                        >
                                            <div className="flex items-center space-x-3 min-w-0">
                                                <Avatar className="h-10 w-10 border-2 border-background">
                                                    <AvatarImage src={member.avatarUrl} />
                                                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold truncate">{member.name}</span>
                                                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                        {studentInfo}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="h-5 w-5 shrink-0" />}
                                        </div>
                                    );
                                })}
                                {filteredMembers.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground text-xs font-medium italic">No matching members found.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter className="p-6 bg-muted/30">
                    <Button onClick={handleConfirm} size="lg" className="w-full h-12 text-lg font-black font-headline shadow-xl" disabled={loading || !name.trim() || selectedMembers.length === 0}>
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {initialData ? 'Save Changes' : 'Create Group'}
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
    const [showInfo, setShowInfo] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    
    // Unconditionally call the hook at the top level
    const isPartnerOnline = useOnlineStatus(selectedContact && !selectedContact.isGroup ? (selectedContact as User).id : null);

    const unsubsRef = useRef<Unsubscribe[]>([]);

    const cleanupListeners = () => {
        unsubsRef.current.forEach(unsub => unsub());
        unsubsRef.current = [];
    };

    const setupLastMessageListener = (id: string, isGroupChat: boolean) => {
        if (!firestore || !user) return;
        const chatId = isGroupChat ? id : [user.id, id].sort().join('_');
        const collName = isGroupChat ? 'groups' : 'chats';
        
        const lastMsgQuery = query(
            collection(firestore, collName, chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsub = onSnapshot(lastMsgQuery, (snap) => {
            if (!snap.empty) {
                const lastMsg = snap.docs[0].data() as ChatMessage;
                setContacts(prev => {
                    const updated = prev.map(c => {
                        const cId = c.isGroup ? c.id : (c as User).id;
                        if (cId === id) {
                            return {
                                ...c,
                                lastMessage: lastMsg.text,
                                lastTimestamp: lastMsg.timestamp,
                                hasUnread: lastMsg.senderId !== user.id && !lastMsg.isRead
                            };
                        }
                        return c;
                    });
                    return [...updated].sort((a, b) => {
                        const timeA = a.lastTimestamp?.toMillis() || 0;
                        const timeB = b.lastTimestamp?.toMillis() || 0;
                        if (timeA !== timeB) return timeB - timeA;
                        return a.name.localeCompare(b.name);
                    });
                });
            }
        });
        unsubsRef.current.push(unsub);
    };

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const fetchAll = async () => {
            try {
                cleanupListeners();
                const usersCol = collection(firestore, 'users');
                let fetchedUsers: User[] = [];

                const adminsQuery = query(usersCol, where('role', '==', 'admin'));
                const adminsSnap = await getDocs(adminsQuery);
                const allAdmins = adminsSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));

                if (user.role === 'admin') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    fetchedUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                } else if (user.role === 'student') {
                    const qTeachers = query(usersCol, where('role', '==', 'teacher'));
                    const tSnap = await getDocs(qTeachers);
                    const allTeachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                    const studentContexts = [user.class, user.level, user.competitiveExam].filter(Boolean);
                    const myTeachers = allTeachers.filter(t => 
                        t.assignedClasses?.some(c => studentContexts.includes(c)) || t.id === user.referredBy
                    );
                    fetchedUsers = [...myTeachers, ...allAdmins];
                } else if (user.role === 'teacher') {
                    const qAll = query(usersCol);
                    const allSnap = await getDocs(qAll);
                    const allUsersList = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                    const teacherAssignments = user.assignedClasses || [];
                    const myStudents = allUsersList.filter(u => {
                        if (u.role !== 'student') return false;
                        if (u.referredBy === user.id) return true;
                        const studentContexts = [u.class, u.level, u.competitiveExam].filter(Boolean);
                        return studentContexts.some(ctx => teacherAssignments.includes(ctx!));
                    });
                    fetchedUsers = [...myStudents, ...allAdmins];
                } else if (user.role === 'promoter') {
                    fetchedUsers = [...allAdmins];
                }

                const uniqueUsers = Array.from(new Map(fetchedUsers.map(u => [u.id, u])).values());

                const groupsQuery = query(collection(firestore, 'groups'), where('members', 'array-contains', user.id));
                const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
                    const fetchedGroups = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatGroup));
                    
                    const combined: ContactWithMetadata[] = [
                        ...uniqueUsers.filter(u => u.id !== user.id).map(u => ({ ...u, isGroup: false } as ContactWithMetadata)),
                        ...fetchedGroups.map(g => ({ ...g, isGroup: true } as ContactWithMetadata))
                    ];

                    setContacts(prev => {
                        return combined.map(c => {
                            const cId = c.isGroup ? c.id : (c as User).id;
                            const existing = prev.find(p => (p.isGroup ? p.id : (p as User).id) === cId);
                            return existing ? { ...c, ...existing, name: c.name, avatarUrl: c.avatarUrl } : c;
                        });
                    });

                    snapshot.docs.forEach(docSnap => {
                        setupLastMessageListener(docSnap.id, true);
                    });
                });
                unsubsRef.current.push(unsubGroups);

                uniqueUsers.forEach(u => {
                    if (u.id !== user.id) setupLastMessageListener(u.id, false);
                });

                setLoading(false);

            } catch (err: any) {
                console.error("Error fetching chat data:", err);
                setLoading(false);
            }
        };

        fetchAll();
        return () => cleanupListeners();
    }, [firestore, user]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showInfo) setShowInfo(false);
                else if (selectedContact) setSelectedContact(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedContact, showInfo]);

    const handleCreateGroup = async (name: string, members: string[]) => {
        if (!firestore || !user) return;
        try {
            const adminsQuery = query(collection(firestore, 'users'), where('role', '==', 'admin'));
            const adminsSnap = await getDocs(adminsQuery);
            const adminIds = adminsSnap.docs.map(d => d.id);
            const allMembers = Array.from(new Set([...members, user.id, ...adminIds]));
            const groupAdmins = Array.from(new Set([user.id, ...adminIds]));

            const groupData = {
                name,
                members: allMembers,
                admins: groupAdmins,
                createdBy: user.id,
                createdAt: serverTimestamp(),
                isGroup: true,
                avatarUrl: `https://picsum.photos/seed/${name.length}/200`
            };

            await addDoc(collection(firestore, 'groups'), groupData);
            toast({ title: 'Group Created', description: `"${name}" is ready.` });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
        }
    };

    const handleUpdateGroup = async (name: string, members: string[]) => {
        if (!firestore || !selectedContact?.isGroup) return;
        try {
            const groupRef = doc(firestore, 'groups', selectedContact.id);
            const adminsQuery = query(collection(firestore, 'users'), where('role', '==', 'admin'));
            const adminsSnap = await getDocs(adminsQuery);
            const adminIds = adminsSnap.docs.map(d => d.id);
            const allMembers = Array.from(new Set([...members, ...adminIds]));

            await updateDoc(groupRef, { name, members: allMembers });
            setSelectedContact({ ...selectedContact, name, members: allMembers });
            toast({ title: 'Group Updated' });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update group.', variant: 'destructive' });
        }
    };

    const handleDeleteGroup = async () => {
        if (!firestore || !selectedContact?.isGroup) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'groups', selectedContact.id));
            setSelectedContact(null);
            setShowInfo(false);
            toast({ title: 'Group Deleted' });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete group.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    const filterOptions = useMemo(() => {
        if (!user) return [];
        const options = [{ id: 'all', label: 'All' }];
        if (user.role === 'admin') {
            options.push({ id: 'student', label: 'Students' }, { id: 'teacher', label: 'Teachers' }, { id: 'promoter', label: 'Promoters' }, { id: 'group', label: 'Groups' });
        } else if (user.role === 'teacher') {
            options.push({ id: 'student', label: 'Students' }, { id: 'group', label: 'Groups' }, { id: 'admin', label: 'Admin' });
        } else {
            options.push({ id: 'group', label: 'Groups' }, { id: 'admin', label: 'Admin' });
        }
        return options;
    }, [user]);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const matchesRole = filter === 'all' 
                ? true 
                : filter === 'group' ? c.isGroup : (!c.isGroup && (c as User).role === filter);
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [contacts, filter, searchQuery]);

    const availableGroupMembers = useMemo(() => {
        const base = contacts.filter(c => !c.isGroup) as User[];
        if (user?.role === 'admin') return base.filter(u => u.role !== 'admin');
        return base.filter(u => u.role === 'student');
    }, [contacts, user]);

    const canManageGroup = useMemo(() => {
        if (!selectedContact?.isGroup || !user) return false;
        const group = selectedContact as ChatGroup;
        return user.role === 'admin' || group.createdBy === user.id || group.admins?.includes(user.id);
    }, [selectedContact, user]);

    return (
        <div className="flex flex-col h-[calc(100svh-12rem)] md:h-[calc(100dvh-10rem)] overflow-hidden bg-background border-none rounded-3xl shadow-2xl relative">
            <div className="flex h-full divide-x-0 md:divide-x border-none">
                {/* Contact List Sidebar */}
                <div className={cn(
                    "w-full md:w-[350px] lg:w-[400px] flex flex-col h-full bg-card shrink-0 transition-all duration-500",
                    selectedContact ? "hidden md:flex opacity-0 md:opacity-100" : "flex opacity-100"
                )}>
                    <div className="p-6 border-b-0 space-y-6 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black font-headline tracking-tighter">Messages</h2>
                            {(user?.role === 'teacher' || user?.role === 'admin') && (
                                <GroupFormDialog 
                                    availableMembers={availableGroupMembers} 
                                    onConfirm={handleCreateGroup} 
                                    trigger={
                                        <Button variant="outline" size="sm" className="rounded-full h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-background/50 backdrop-blur-sm border-2">
                                            <Plus className="h-4 w-4" />
                                            Group
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search chats..." 
                                className="pl-11 h-12 bg-muted/50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-primary/20"
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
                                    className={cn(
                                        "rounded-full h-8 px-5 text-[10px] font-black uppercase tracking-widest shrink-0 transition-all",
                                        filter === item.id ? "shadow-lg scale-105" : "bg-muted/50 hover:bg-muted"
                                    )}
                                    onClick={() => setFilter(item.id as any)}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-muted/10">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                            </div>
                        ) : filteredContacts.length > 0 ? (
                            <ScrollArea className="h-full">
                                <div className="flex flex-col py-2">
                                    {filteredContacts.map(contact => (
                                        <ContactItem 
                                            key={contact.isGroup ? contact.id : (contact as User).id}
                                            contact={contact}
                                            isSelected={selectedContact?.id === contact.id}
                                            onSelect={() => { setSelectedContact(contact); setShowInfo(false); }}
                                            currentUserId={user!.id}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12">
                                <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                                    <Filter className="h-10 w-10 opacity-20" />
                                </div>
                                <p className="text-sm font-bold font-headline tracking-tighter">No conversations found.</p>
                                <p className="text-[10px] uppercase font-black tracking-widest mt-1 opacity-50">Try a different filter</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col h-full bg-background relative transition-all duration-500",
                    !selectedContact && "hidden md:flex items-center justify-center bg-muted/5"
                )}>
                    {user && selectedContact ? (
                        <div className="flex h-full w-full relative">
                            <div className={cn("flex flex-col h-full w-full", showInfo && "hidden lg:flex")}>
                                <ChatInterface 
                                    currentUser={user} 
                                    chatPartner={selectedContact as any} 
                                    isGroup={selectedContact.isGroup}
                                    onBack={() => setSelectedContact(null)}
                                    onHeaderClick={() => setShowInfo(true)}
                                    onDeleteGroup={canManageGroup ? () => setConfirmDeleteOpen(true) : undefined}
                                />
                            </div>

                            {/* Info Panel */}
                            {showInfo && (
                                <div className={cn(
                                    "absolute inset-0 z-[60] bg-background lg:relative lg:w-[380px] lg:border-l lg:z-0 flex flex-col transition-all animate-in slide-in-from-right-full md:slide-in-from-right-0",
                                    !showInfo && "hidden"
                                )}>
                                    <div className="p-6 border-b flex items-center justify-between bg-card/50 backdrop-blur-md shrink-0">
                                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" />
                                            {selectedContact.isGroup ? 'Group Details' : 'Profile'}
                                        </h3>
                                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setShowInfo(false)}>
                                            <X className="h-6 w-6" />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 bg-muted/5">
                                        <div className="p-8 space-y-10">
                                            <div className="flex flex-col items-center text-center space-y-6">
                                                <div className="relative">
                                                    <Avatar className={cn("h-40 w-40 shadow-2xl border-[6px] border-background", selectedContact.isGroup ? "rounded-[2rem]" : "rounded-full")}>
                                                        <AvatarImage src={selectedContact.avatarUrl} />
                                                        <AvatarFallback className="text-5xl font-black font-headline">{selectedContact.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    {isPartnerOnline && (
                                                        <div className="absolute bottom-3 right-3 w-6 h-6 bg-green-500 rounded-full border-[4px] border-background shadow-lg" />
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h2 className="text-3xl font-black font-headline tracking-tighter">{selectedContact.name}</h2>
                                                    {selectedContact.isGroup ? (
                                                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                                                            Formed {format((selectedContact as ChatGroup).createdAt.toDate(), 'PP')}
                                                        </p>
                                                    ) : (
                                                        <Badge className="font-black uppercase text-[10px] tracking-widest px-3 py-1">{(selectedContact as User).role}</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <Separator className="opacity-50" />

                                            {selectedContact.isGroup ? (
                                                <div className="space-y-8">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                                                            Members ({(selectedContact as ChatGroup).members.length})
                                                        </h4>
                                                        {canManageGroup && (
                                                            <GroupFormDialog 
                                                                availableMembers={availableGroupMembers} 
                                                                onConfirm={handleUpdateGroup}
                                                                initialData={{ 
                                                                    name: selectedContact.name, 
                                                                    members: (selectedContact as ChatGroup).members 
                                                                }}
                                                                trigger={
                                                                    <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 shadow-md">
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {(selectedContact as ChatGroup).members.map(memberId => {
                                                            const member = contacts.find(c => !c.isGroup && (c as User).id === memberId) as User;
                                                            if (!member && memberId === user.id) return (
                                                                <div key={user.id} className="flex items-center gap-4 bg-background p-3 rounded-2xl shadow-sm border border-muted">
                                                                    <Avatar className="h-10 w-10 border-2 border-primary"><AvatarImage src={user.avatarUrl} /><AvatarFallback>ME</AvatarFallback></Avatar>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-black">You</p>
                                                                        <p className="text-[10px] font-black text-primary uppercase tracking-tighter">Administrator</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                            if (!member) return null;
                                                            return (
                                                                <div key={memberId} className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-2xl transition-all">
                                                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm"><AvatarImage src={member.avatarUrl} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold truncate">{member.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{member.role}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {canManageGroup && (
                                                        <Button variant="destructive" className="w-full mt-8 h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg" onClick={() => setConfirmDeleteOpen(true)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            End Group
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="bg-background p-6 rounded-[2rem] shadow-xl border border-muted space-y-6">
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                <UserIcon className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">ID Reference</p>
                                                                <p className="truncate font-mono text-xs opacity-70">{(selectedContact as User).id}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                                                <Calendar className="h-5 w-5 text-accent" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Community Member Since</p>
                                                                <p className="font-bold">{(selectedContact as User).createdAt ? format((selectedContact as User).createdAt!.toDate(), 'PP') : 'Foundation'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-primary/10 rounded-[2rem] space-y-2 border-2 border-primary/20">
                                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">Student Status</p>
                                                        <p className="text-sm font-bold leading-relaxed">
                                                            {(selectedContact as User).role === 'student' 
                                                                ? `Enrolled in ${(selectedContact as User).class || (selectedContact as User).level || 'General Courses'}.` 
                                                                : `Verified platform ${(selectedContact as User).role}.`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse">
                                    <UsersIcon className="h-16 w-16 text-primary opacity-40" />
                                </div>
                                <div className="absolute -top-2 -right-2 h-10 w-10 bg-background rounded-full border-2 shadow-lg flex items-center justify-center">
                                    <MessagesSquare className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div className="max-w-xs">
                                <h3 className="text-2xl font-black font-headline tracking-tighter">Your Learning Lounge</h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-2 leading-relaxed">
                                    Select a classmate, mentor, or group to start your educational journey.
                                </p>
                            </div>
                            <Badge variant="outline" className="font-black uppercase text-[10px] tracking-widest py-1 border-primary/30">End-to-end Encrypted</Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Dialogs */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">
                            This will permanently delete the group "{selectedContact?.name}" and all its history. This action cannot be reversed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Wait, Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Yes, Delete Permanently'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
