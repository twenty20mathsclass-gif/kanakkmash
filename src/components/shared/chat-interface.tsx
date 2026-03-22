
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User, ChatMessage } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ChatInterfaceProps {
  currentUser: User;
  chatPartner: User;
}

export function ChatInterface({ currentUser, chatPartner }: ChatInterfaceProps) {
  const { firestore } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatId = useMemo(() => {
    return [currentUser.id, chatPartner.id].sort().join('_');
  }, [currentUser.id, chatPartner.id]);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const messagesQuery = query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
      setLoading(false);
    }, (err: any) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `chats/${chatId}/messages`,
                operation: 'list',
            }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, chatId]);

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

    const messagesCollection = collection(firestore, 'chats', chatId, 'messages');
    const messageData = {
        text: newMessage,
        senderId: currentUser.id,
        timestamp: serverTimestamp()
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
    <div className="flex flex-col h-full w-full bg-[#E5DDD5] dark:bg-muted/10">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarImage src={chatPartner.avatarUrl} alt={chatPartner.name} />
                <AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h3 className="font-bold text-sm leading-tight">{chatPartner.name}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {chatPartner.role === 'student' ? 'Student' : chatPartner.role}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
            <Video className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
            <Phone className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
            <MoreVertical className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 relative" ref={scrollAreaRef}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://i.ibb.co/L5QG0HV/cartoon-maths-elements-background-education-logo-vector.jpg')] bg-repeat bg-center" />
        {loading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="py-6 flex flex-col gap-2 relative z-10">
                {messages.map((msg, index) => {
                    const isSentByCurrentUser = msg.senderId === currentUser.id;
                    const showDate = index === 0 || (msg.timestamp && messages[index-1].timestamp && format(msg.timestamp.toDate(), 'P') !== format(messages[index-1].timestamp.toDate(), 'P'));

                    return (
                        <div key={msg.id} className="w-full flex flex-col">
                            {showDate && msg.timestamp && (
                                <div className="flex justify-center my-4">
                                    <span className="bg-background/80 backdrop-blur-sm text-[10px] uppercase font-bold px-3 py-1 rounded-full text-muted-foreground shadow-sm">
                                        {format(msg.timestamp.toDate(), 'MMMM d, yyyy')}
                                    </span>
                                </div>
                            )}
                            <div className={cn('flex w-full mb-1', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
                                <div className={cn(
                                    'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-xl shadow-sm relative group',
                                    isSentByCurrentUser 
                                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                        : 'bg-card text-foreground rounded-tl-none'
                                )}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                    <div className={cn(
                                        'flex items-center justify-end gap-1 mt-1 opacity-70',
                                        isSentByCurrentUser ? 'text-primary-foreground' : 'text-muted-foreground'
                                    )}>
                                        <span className="text-[9px] font-medium">
                                            {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : ''}
                                        </span>
                                    </div>
                                    {/* Bubble tail replacement with rounded corners logic above */}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </ScrollArea>

      {/* Input */}
      <footer className="p-3 bg-card border-t shrink-0 z-10">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2 max-w-5xl mx-auto">
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10">
                <Smile className="h-6 w-6" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10">
                <Paperclip className="h-6 w-6 rotate-45" />
            </Button>
            <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                autoComplete="off"
                className="flex-1 h-11 bg-muted/50 border-none rounded-full px-6 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full h-11 w-11 shadow-lg shrink-0">
                <Send className="h-5 w-5" />
                <span className="sr-only">Send</span>
            </Button>
        </form>
      </footer>
    </div>
  );
}
