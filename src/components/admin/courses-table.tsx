'use client';

import type { Course } from '@/lib/definitions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CoursesTable({ courses }: { courses: Course[] }) {
    const { toast } = useToast();

    const handleAction = (action: string, courseTitle: string) => {
        toast({
            title: `Action: ${action}`,
            description: `Mock action "${action}" for course "${courseTitle}".`,
        })
    }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden w-[100px] sm:table-cell">
            <span className="sr-only">Image</span>
          </TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Modules</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => {
            const courseImage = PlaceHolderImages.find(img => img.id === course.imageId);
            return (
                <TableRow key={course.id}>
                    <TableCell className="hidden sm:table-cell">
                    {courseImage && (
                        <Image
                            src={courseImage.imageUrl}
                            alt={course.title}
                            width={100}
                            height={67}
                            className="aspect-video rounded-md object-cover"
                            data-ai-hint={courseImage.imageHint}
                        />
                    )}
                    </TableCell>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.modules.length}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction('Edit', course.title)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('Delete', course.title)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
            )
        })}
      </TableBody>
    </Table>
  );
}
