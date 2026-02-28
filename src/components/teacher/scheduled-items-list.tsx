'use client';

import type { Schedule } from '@/lib/definitions';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, BookOpen, User, Award } from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: User,
  Award: Award,
  BookOpen: BookOpen,
};


export function ScheduledItemsList({ schedules, title, description }: { schedules: Schedule[], title: string, description: string }) {

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
                                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(schedule.date.toDate(), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{getFormattedTime(schedule.startTime)}</span>
                                    </div>
                                </div>
                                {(schedule.class || schedule.syllabus) && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {schedule.class && <Badge variant="secondary">{schedule.class}</Badge>}
                                        {schedule.syllabus && <Badge variant="secondary">{schedule.syllabus}</Badge>}
                                    </div>
                                )}
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
    </Card>
  );
}
