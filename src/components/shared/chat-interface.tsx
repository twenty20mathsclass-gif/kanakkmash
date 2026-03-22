'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { User, ChatMessage, ChatGroup } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile, Camera, Mic, ArrowLeft, Info, Trash2, Check, CheckCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatInterfaceProps {
  currentUser: User;
  chatPartner: User | ChatGroup;
  isGroup?: boolean;
  onBack?: () => void;
  onHeaderClick?: () => void;
  onDeleteGroup?: () => void;
}

export function ChatInterface({ 
    currentUser, 
    chatPartner, 
    isGroup = false, 
    onBack, 
    onHeaderClick,
    onDeleteGroup 
}: ChatInterfaceProps) {
  const { firestore } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatId = useMemo(() => {
    if (isGroup) return chatPartner.id;
    return [currentUser.id, (chatPartner as User).id].sort().join('_');
  }, [currentUser.id, chatPartner.id, isGroup]);

  const collectionPath = isGroup ? `groups/${chatId}/messages` : `chats/${chatId}/messages`;

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const messagesQuery = query(
      collection(firestore, collectionPath),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
      setLoading(false);

      const unreadMsgs = snapshot.docs.filter(d => {
          const data = d.data();
          return data.senderId !== currentUser.id && !data.isRead;
      });

      if (unreadMsgs.length > 0) {
          const batch = writeBatch(firestore);
          unreadMsgs.forEach(d => {
              batch.update(d.ref, { isRead: true });
          });
          batch.commit().catch(err => console.warn("Failed to mark messages as read", err));
      }

    }, (err: any) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: collectionPath,
                operation: 'list',
            }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, collectionPath, currentUser.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !firestore) return;

    const messagesCollection = collection(firestore, collectionPath);
    const messageData = {
        text: newMessage,
        senderId: currentUser.id,
        timestamp: serverTimestamp(),
        isRead: false
    };
    
    const currentMsg = newMessage;
    setNewMessage('');
    
    addDoc(messagesCollection, messageData)
        .catch((err: any) => {
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: messagesCollection.path,
                    operation: 'create',
                    requestResourceData: messageData
                }, { cause: err });
                errorEmitter.emit('permission-error', permissionError);
            }
            setNewMessage(currentMsg);
        });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none z-0" 
           style={{ 
             backgroundImage: "url('https://i.ibb.co/L5QG0HV/cartoon-maths-elements-background-education-logo-vector.jpg')",
             backgroundSize: '400px',
             backgroundRepeat: 'repeat',
             filter: 'grayscale(100%)'
           }} 
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-card/95 backdrop-blur-md border-b-0 shadow-lg z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
            {onBack && (
                <Button variant="ghost" size="icon" className="rounded-full md:hidden h-10 w-10 active:scale-90 transition-transform" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
            )}
            <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1.5 rounded-2xl transition-all min-w-0 active:scale-[0.98]"
                onClick={onHeaderClick}
            >
                <div className="relative shrink-0">
                    <Avatar className={cn("h-11 w-11 border-2 border-background shadow-md", isGroup ? "rounded-xl" : "rounded-full")}>
                        <AvatarImage src={chatPartner.avatarUrl} alt={chatPartner.name} />
                        <AvatarFallback className="font-bold font-headline">{chatPartner.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="min-w-0">
                    <h3 className="font-black text-base leading-tight truncate font-headline tracking-tighter">{chatPartner.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black truncate opacity-70">
                        {isGroup ? `${(chatPartner as ChatGroup).members?.length || 0} participants` : (chatPartner as User).role}
                    </p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hidden sm:flex"><Video className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hidden sm:flex"><Phone className="h-5 w-5" /></Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                        <MoreVertical className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-48">
                    <DropdownMenuItem onClick={onHeaderClick} className="rounded-xl py-2.5 font-bold text-xs uppercase tracking-widest">
                        <Info className="mr-3 h-4 w-4 text-primary" /> Info
                    </DropdownMenuItem>
                    {isGroup && onDeleteGroup && (
                        <DropdownMenuItem onClick={onDeleteGroup} className="rounded-xl py-2.5 font-bold text-xs uppercase tracking-widest text-destructive">
                            <Trash2 className="mr-3 h-4 w-4" /> End Group
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 md:px-8 relative z-10" ref={scrollAreaRef}>
        {loading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
            </div>
        ) : (
            <div className="py-8 flex flex-col gap-2">
                <div className="flex justify-center mb-6">
                    <span className="bg-primary/10 backdrop-blur-sm text-[9px] uppercase font-black px-4 py-1.5 rounded-full text-primary border border-primary/20 shadow-sm flex items-center gap-2">
                        <CheckCheck className="h-3 w-3" /> End-to-end encrypted
                    </span>
                </div>
                {messages.map((msg, index) => {
                    const isSentByCurrentUser = msg.senderId === currentUser.id;
                    const showDate = index === 0 || (msg.timestamp && messages[index-1].timestamp && format(msg.timestamp.toDate(), 'P') !== format(messages[index-1].timestamp.toDate(), 'P'));

                    return (
                        <div key={msg.id || index} className="w-full flex flex-col">
                            {showDate && msg.timestamp && (
                                <div className="flex justify-center my-6">
                                    <span className="bg-card/80 backdrop-blur-md text-[10px] uppercase font-black px-5 py-1.5 rounded-full text-muted-foreground shadow-md border-none">
                                        {format(msg.timestamp.toDate(), 'MMMM d, yyyy')}
                                    </span>
                                </div>
                            )}
                            <div className={cn('flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
                                <div className={cn(
                                    'max-w-[85%] md:max-w-[65%] px-3.5 py-2 rounded-2xl shadow-md relative group transition-all',
                                    isSentByCurrentUser 
                                        ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground dark:text-white rounded-tr-none' 
                                        : 'bg-card text-foreground rounded-tl-none border-none'
                                )}>
                                    {isGroup && !isSentByCurrentUser && (
                                        <p className="text-[10px] font-black text-primary mb-1 opacity-90 tracking-tighter">~ {msg.senderId.substring(0, 5)}</p>
                                    )}
                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                                    <div className={cn(
                                        'flex items-center justify-end gap-1.5 mt-1 opacity-60',
                                        isSentByCurrentUser ? 'text-foreground/70 dark:text-white/70' : 'text-muted-foreground'
                                    )}>
                                        <span className="text-[9px] font-black uppercase tracking-tighter">
                                            {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : ''}
                                        </span>
                                        {isSentByCurrentUser && (
                                            msg.isRead ? <CheckCheck className="h-3 w-3 text-blue-500" /> : <Check className="h-3 w-3" />
                                        )}
                                    </div>
                                    {/* Tail */}
                                    <div className={cn(
                                        "absolute top-0 w-3 h-3",
                                        isSentByCurrentUser 
                                            ? "-right-2 bg-[#dcf8c6] dark:bg-[#005c4b]" 
                                            : "-left-2 bg-card",
                                        "clip-path-chat-tail"
                                    )} style={{
                                        clipPath: isSentByCurrentUser 
                                            ? 'polygon(0 0, 0% 100%, 100% 0)' 
                                            : 'polygon(100% 0, 0 0, 100% 100%)'
                                    }}/>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </ScrollArea>

      {/* Input Footer */}
      <footer className="p-4 bg-transparent shrink-0 z-10 pb-24 md:pb-6 safe-area-bottom">
        <form onSubmit={handleSendMessage} className="flex w-full items-end gap-3 max-w-5xl mx-auto">
            <div className="flex-1 flex items-center bg-card rounded-[1.5rem] px-3 py-1.5 shadow-xl border-none focus-within:ring-2 focus-within:ring-primary/20 transition-all min-h-[52px]">
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10 shrink-0 hover:bg-muted/50 active:scale-90">
                    <Smile className="h-6 w-6" />
                </Button>
                <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    autoComplete="off"
                    className="flex-1 h-10 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-0 shadow-none placeholder:text-muted-foreground/50 font-medium"
                />
                <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10 hover:bg-muted/50 active:scale-90">
                        <Paperclip className="h-5 w-5 rotate-45" />
                    </Button>
                    {!newMessage.trim() && (
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10 hover:bg-muted/50 active:scale-90">
                            <Camera className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="shrink-0">
                <Button 
                    type="submit" 
                    size="icon" 
                    className={cn(
                        "rounded-full h-12 w-12 shadow-2xl transition-all active:scale-90",
                        newMessage.trim() ? "bg-primary hover:bg-primary/90" : "bg-muted-foreground/30 text-muted-foreground"
                    )}
                    disabled={!newMessage.trim()}
                >
                    <Send className="h-5 w-5 text-white translate-x-0.5" />
                    <span className="sr-only">Send</span>
                </Button>
            </div>
        </form>
      </footer>
    </div>
  );
}
