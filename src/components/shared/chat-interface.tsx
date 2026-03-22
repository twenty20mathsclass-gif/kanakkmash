
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { User, ChatMessage, ChatGroup } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile, Camera, Mic } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ChatInterfaceProps {
  currentUser: User;
  chatPartner: User | ChatGroup;
  isGroup?: boolean;
}

export function ChatInterface({ currentUser, chatPartner, isGroup = false }: ChatInterfaceProps) {
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

      // Improved Read Status Logic: Mark messages as read when the chat is active
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

  const isGroupObj = isGroup && 'members' in chatPartner;

  return (
    <div className="flex flex-col h-full w-full bg-[#F0F2F5] dark:bg-[#0B141A] relative overflow-hidden">
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" 
           style={{ 
             backgroundImage: "url('https://i.ibb.co/L5QG0HV/cartoon-maths-elements-background-education-logo-vector.jpg')",
             backgroundSize: '300px',
             backgroundRepeat: 'repeat'
           }} 
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-background border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3 pl-10 md:pl-0 min-w-0">
            <Avatar className={cn("h-10 w-10 border shadow-sm shrink-0", isGroup && "rounded-lg")}>
                <AvatarImage src={chatPartner.avatarUrl} alt={chatPartner.name} />
                <AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <h3 className="font-bold text-sm leading-tight truncate">{chatPartner.name}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold truncate">
                    {isGroup ? `${(chatPartner as ChatGroup).members.length} members` : (chatPartner as User).role}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground shrink-0">
            <Video className="h-5 w-5 cursor-pointer hover:text-primary transition-colors hidden sm:block" />
            <Phone className="h-5 w-5 cursor-pointer hover:text-primary transition-colors hidden sm:block" />
            <MoreVertical className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 relative z-10" ref={scrollAreaRef}>
        {loading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="py-6 flex flex-col gap-1.5">
                {messages.map((msg, index) => {
                    const isSentByCurrentUser = msg.senderId === currentUser.id;
                    const showDate = index === 0 || (msg.timestamp && messages[index-1].timestamp && format(msg.timestamp.toDate(), 'P') !== format(messages[index-1].timestamp.toDate(), 'P'));

                    return (
                        <div key={msg.id} className="w-full flex flex-col">
                            {showDate && msg.timestamp && (
                                <div className="flex justify-center my-4">
                                    <span className="bg-background/90 backdrop-blur-sm text-[10px] uppercase font-black px-4 py-1 rounded-full text-muted-foreground shadow-sm border">
                                        {format(msg.timestamp.toDate(), 'MMMM d, yyyy')}
                                    </span>
                                </div>
                            )}
                            <div className={cn('flex w-full', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
                                <div className={cn(
                                    'max-w-[85%] md:max-w-[70%] px-2.5 py-1.5 rounded-xl shadow-sm relative group transition-all',
                                    isSentByCurrentUser 
                                        ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-foreground dark:text-white rounded-tr-none' 
                                        : 'bg-background text-foreground rounded-tl-none border border-border/50'
                                )}>
                                    {isGroup && !isSentByCurrentUser && (
                                        <p className="text-[10px] font-black text-primary mb-0.5 opacity-80">~ User</p>
                                    )}
                                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    <div className={cn(
                                        'flex items-center justify-end gap-1 mt-0.5 opacity-60',
                                        isSentByCurrentUser ? 'text-foreground/70 dark:text-white/70' : 'text-muted-foreground'
                                    )}>
                                        <span className="text-[9px] font-medium">
                                            {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </ScrollArea>

      {/* Modern Optimized Chat Bar */}
      <footer className="p-3 bg-card/80 backdrop-blur-md border-t shrink-0 z-10 pb-20 md:pb-4">
        <form onSubmit={handleSendMessage} className="flex w-full items-end gap-2 max-w-5xl mx-auto">
            <div className="flex-1 flex items-center bg-background rounded-2xl px-2 py-1 shadow-sm border focus-within:ring-1 focus-within:ring-primary/30 transition-all min-h-[44px]">
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-9 w-9 shrink-0 hover:bg-muted/50">
                    <Smile className="h-5 w-5" />
                </Button>
                <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message..."
                    autoComplete="off"
                    className="flex-1 h-9 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-0 shadow-none placeholder:text-muted-foreground/60"
                />
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-9 w-9 hover:bg-muted/50">
                        <Paperclip className="h-5 w-5 rotate-45" />
                    </Button>
                    {!newMessage.trim() && (
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-9 w-9 hover:bg-muted/50">
                            <Camera className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="shrink-0 pb-0.5">
                {newMessage.trim() ? (
                    <Button type="submit" size="icon" className="rounded-full h-11 w-11 shadow-md bg-primary hover:bg-primary/90 transition-all active:scale-90">
                        <Send className="h-5 w-5 text-primary-foreground translate-x-0.5" />
                        <span className="sr-only">Send</span>
                    </Button>
                ) : (
                    <Button type="button" size="icon" className="rounded-full h-11 w-11 shadow-md bg-primary hover:bg-primary/90 transition-all active:scale-90">
                        <Mic className="h-5 w-5 text-primary-foreground" />
                        <span className="sr-only">Record</span>
                    </Button>
                )}
            </div>
        </form>
      </footer>
    </div>
  );
}
