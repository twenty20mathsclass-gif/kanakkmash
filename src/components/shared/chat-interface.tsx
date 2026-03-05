'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User, ChatMessage } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
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
        console.error("Chat listener error:", err);
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
    
    setNewMessage('');
    
    addDoc(messagesCollection, messageData)
        .catch((err: any) => {
            console.error("Error sending message:", err);
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `chats/${chatId}/messages`,
                    operation: 'create',
                    requestResourceData: {text: newMessage}
                }, { cause: err });
                errorEmitter.emit('permission-error', permissionError);
            }
            // Re-set the message so user can try again
            setNewMessage(newMessage);
        });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center gap-3 border-b">
        <Avatar>
            <AvatarImage src={chatPartner.avatarUrl} alt={chatPartner.name} />
            <AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <CardTitle className="font-headline">{chatPartner.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : messages.length > 0 ? (
                <div className="space-y-4">
                    {messages.map(msg => {
                        const isSentByCurrentUser = msg.senderId === currentUser.id;
                        return (
                            <div key={msg.id} className={cn('flex items-end gap-2', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
                                {!isSentByCurrentUser && <Avatar className="h-8 w-8"><AvatarImage src={chatPartner.avatarUrl} /><AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback></Avatar>}
                                <div className={cn('max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg', isSentByCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={cn('text-xs mt-1', isSentByCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : ''}
                                    </p>
                                </div>
                                {isSentByCurrentUser && <Avatar className="h-8 w-8"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback></Avatar>}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                    <p>No messages yet. Say hello!</p>
                </div>
            )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                autoComplete="off"
            />
            <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
            </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
