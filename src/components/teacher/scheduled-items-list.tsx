'use client';

import type { Schedule } from '@/lib/definitions';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, BookOpen, User, Award, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: User,
  Award: Award,
  BookOpen: BookOpen,
  Loader2: Loader2,
};

export function ScheduledItemsList({ schedules, title, description }: { schedules: Schedule[], title: string, description: string }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Schedule | null>(null);

  const handleDelete = async () => {
    if (!firestore || !itemToDelete) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'schedules', itemToDelete.id));
        if (itemToDelete.type === 'homework' && itemToDelete.homeworkId) {
            await deleteDoc(doc(firestore, 'homeworks', itemToDelete.homeworkId));
        }
        toast({ title: 'Success', description: 'Item deleted successfully.' });
    } catch (error) {
        console.error("Delete error:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete item.' });
    } finally {
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };

  const getFormattedTime = (time: string) => {
    if (!time) return '';
    try {
      const date = parse(time, 'HH:mm', new Date());
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {schedules.length > 0 ? (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {schedules.map((schedule) => {
                  const IconComponent = iconMap[schedule.icon] || BookOpen;
                  return (
                  <Card key={schedule.id} className="shadow-sm" style={{borderColor: schedule.color}}>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-lg flex items-center justify-center" style={{backgroundColor: schedule.color, color: schedule.textColor}}>
                                <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="font-bold leading-tight">{schedule.title}</p>
                                <p className="text-xs text-muted-foreground">{schedule.subject}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                                    {schedule.date && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format(schedule.date.toDate(), 'MMM d, yyyy')}</span>
                                        </div>
                                    )}
                                    {schedule.startDate && schedule.endDate && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format(schedule.startDate.toDate(), 'MMM d')} - {format(schedule.endDate.toDate(), 'MMM d, yyyy')}</span>
                                        </div>
                                    )}
                                    {schedule.startTime && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{getFormattedTime(schedule.startTime)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {schedule.classes?.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                                    {schedule.syllabus && <Badge variant="secondary">{schedule.syllabus}</Badge>}
                                    {schedule.competitiveExam && <Badge variant="secondary">{schedule.competitiveExam}</Badge>}
                                    {schedule.levels?.map(l => <Badge key={l} variant="outline" className="text-primary border-primary/20 bg-primary/5">{l}</Badge>)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => router.push(`/teacher/homework/edit/${schedule.id}`)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(schedule)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-16">
            No items scheduled yet.
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this {itemToDelete?.type}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}
