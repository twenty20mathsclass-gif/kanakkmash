
"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center relative mb-4 px-1",
        caption_label: "text-xl font-bold font-headline text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 p-0 rounded-full hover:bg-accent"
        ),
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 mb-2",
        head_cell:
          "text-muted-foreground w-9 font-normal text-[0.8rem] text-center uppercase",
        row: "grid grid-cols-7 w-full",
        cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex justify-center items-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal rounded-full transition-transform hover:scale-105"
        ),
        day_selected:
          "bg-primary text-primary-foreground rounded-full shadow-lg scale-105 hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent/50 text-accent-foreground rounded-full ring-2 ring-primary/30",
        day_outside: "day-outside text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      formatters={{
        formatCaption: (month, options) =>
          format(month, "MMMM, yyyy", { locale: options?.locale }),
        formatWeekdayName: (day, options) =>
          format(day, "EEE", { locale: options?.locale }),
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" />,
        ...props.components
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

