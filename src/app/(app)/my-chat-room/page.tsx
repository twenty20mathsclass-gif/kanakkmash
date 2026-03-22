'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, addDoc, serverTimestamp, Unsubscribe, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, ChatMessage, ChatGroup } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Filter, ArrowLeft, Plus, Users as UsersIcon, Info, Edit, Trash2, X, MoreVertical, User as UserIcon, Calendar } from 'lucide-react';
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
                        <p className={cn("text-sm truncate font-bold", contact.hasUnread && !isSelected && "text-primary")}>{contact.name}</p>
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Group' : 'Create Group'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update group details and members.' : 'Create a group with students or teachers. Admins will be added automatically.'}
                    </DialogDescription>
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
                        <Label>Select Members ({selectedMembers.length})</Label>
                        <ScrollArea className="flex-1 border rounded-md p-2">
                            <div className="space-y-3">
                                {availableMembers.map(member => (
                                    <div key={member.id} className="flex items-center space-x-3">
                                        <Checkbox 
                                            id={`member-${member.id}`} 
                                            checked={selectedMembers.includes(member.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedMembers(prev => 
                                                    checked 
                                                        ? [...prev, member.id] 
                                                        : prev.filter(id => id !== member.id)
                                                );
                                            }}
                                        />
                                        <label 
                                            htmlFor={`member-${member.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.avatarUrl} />
                                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span>{member.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{member.role}</span>
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={loading || !name.trim() || selectedMembers.length === 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        <div className="flex flex-col h-[calc(100svh-12rem)] md:h-[calc(100dvh-10rem)] overflow-hidden bg-background border rounded-xl shadow-2xl relative">
            <div className="flex h-full divide-x">
                {/* Contact List Sidebar */}
                <div className={cn(
                    "w-full md:w-[350px] lg:w-[400px] flex flex-col h-full bg-card shrink-0",
                    selectedContact && "hidden md:flex"
                )}>
                    <div className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold font-headline">Messages</h2>
                            {(user?.role === 'teacher' || user?.role === 'admin') && (
                                <GroupFormDialog 
                                    availableMembers={availableGroupMembers} 
                                    onConfirm={handleCreateGroup} 
                                    trigger={
                                        <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1.5">
                                            <Plus className="h-3.5 w-3.5" />
                                            New Group
                                        </Button>
                                    }
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
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                <Filter className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm">No conversations found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col h-full bg-muted/20 relative transition-all duration-300",
                    !selectedContact && "hidden md:flex items-center justify-center"
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
                                    "absolute inset-0 z-[60] bg-background lg:relative lg:w-[350px] lg:border-l lg:z-0 flex flex-col transition-all animate-in slide-in-from-right-full md:slide-in-from-right-0",
                                    !showInfo && "hidden"
                                )}>
                                    <div className="p-4 border-b flex items-center justify-between bg-card shrink-0">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" />
                                            {selectedContact.isGroup ? 'Group Info' : 'Contact Info'}
                                        </h3>
                                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowInfo(false)}>
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-6 space-y-8">
                                            <div className="flex flex-col items-center text-center space-y-4">
                                                <Avatar className={cn("h-32 w-32 shadow-xl border-4 border-background", selectedContact.isGroup && "rounded-2xl")}>
                                                    <AvatarImage src={selectedContact.avatarUrl} />
                                                    <AvatarFallback className="text-4xl">{selectedContact.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h2 className="text-2xl font-bold">{selectedContact.name}</h2>
                                                    {selectedContact.isGroup ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            Created {format((selectedContact as ChatGroup).createdAt.toDate(), 'PP')}
                                                        </p>
                                                    ) : (
                                                        <Badge className="mt-1 capitalize">{(selectedContact as User).role}</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <Separator />

                                            {selectedContact.isGroup ? (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
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
                                                                    <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                                                                        <Edit className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="space-y-3">
                                                        {(selectedContact as ChatGroup).members.map(memberId => {
                                                            const member = contacts.find(c => !c.isGroup && (c as User).id === memberId) as User;
                                                            if (!member && memberId === user.id) return (
                                                                <div key={user.id} className="flex items-center gap-3">
                                                                    <Avatar className="h-8 w-8 border"><AvatarImage src={user.avatarUrl} /><AvatarFallback>ME</AvatarFallback></Avatar>
                                                                    <p className="text-sm font-bold">You <span className="text-[10px] font-normal text-muted-foreground ml-1">(Admin)</span></p>
                                                                </div>
                                                            );
                                                            if (!member) return null;
                                                            return (
                                                                <div key={memberId} className="flex items-center gap-3">
                                                                    <Avatar className="h-8 w-8 border"><AvatarImage src={member.avatarUrl} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium truncate">{member.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase">{member.role}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {canManageGroup && (
                                                        <Button variant="destructive" className="w-full mt-8" onClick={() => setConfirmDeleteOpen(true)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Group
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <UserIcon className="h-4 w-4 text-primary shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground uppercase font-black">User ID</p>
                                                            <p className="truncate font-mono">{(selectedContact as User).id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground uppercase font-black">Enrolled On</p>
                                                            <p>{(selectedContact as User).createdAt ? format((selectedContact as User).createdAt!.toDate(), 'PP') : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <Separator className="my-4" />
                                                    <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-primary">Status</p>
                                                        <p className="text-sm">
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

            {/* Global Dialogs */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the group "{selectedContact?.name}" and all its messages. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Yes, Delete Group'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
