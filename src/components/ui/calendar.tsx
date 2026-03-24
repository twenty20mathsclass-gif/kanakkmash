"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  eventDates?: Date[]
  onCancel?: () => void
  onApply?: () => void
  containerClassName?: string
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  eventDates = [],
  onCancel,
  onApply,
  containerClassName,
  ...props
}: CalendarProps) {
  return (
    <div className={cn(
      "bg-white rounded-[2rem] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col p-4 w-[340px] h-auto min-h-[340px] aspect-square overflow-hidden",
      containerClassName
    )}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        weekStartsOn={1}
        fixedWeeks
        className={cn("w-full h-full flex flex-col items-center", className)}
        classNames={{
          months: "flex flex-col w-full h-full relative items-center justify-center",
          month: "w-full flex flex-col h-full items-center",
          month_caption: "flex justify-center items-center h-6 mb-3 w-full shrink-0 relative",
          caption_label: "text-sm font-bold text-gray-900 tracking-tight",
          nav: "flex items-center justify-between w-full absolute top-0 left-0 right-0 h-6 px-1 z-50 pointer-events-none",
          button_previous: cn(
            buttonVariants({ variant: "ghost" }),
            "h-6 w-6 text-gray-400 hover:text-orange-500 hover:bg-orange-50/50 rounded-full flex items-center justify-center p-0 transition-all pointer-events-auto"
          ),
          button_next: cn(
            buttonVariants({ variant: "ghost" }),
            "h-6 w-6 text-gray-400 hover:text-orange-500 hover:bg-orange-50/50 rounded-full flex items-center justify-center p-0 transition-all pointer-events-auto"
          ),
          month_grid: "w-full border-collapse flex-1 flex flex-col items-center",
          weeks: "w-full flex-1 flex flex-col justify-around",
          weekdays: "flex w-full mb-2 shrink-0 px-1",
          weekday: "text-gray-300 w-[calc(100%/7)] font-black text-[9px] text-center uppercase tracking-wider",
          week: "flex w-full border-t border-gray-50 flex-1 items-center justify-center first:border-0 py-0.5",
          day: "h-full w-[calc(100%/7)] relative flex items-center justify-center",
          day_button: cn(
            "h-7 w-7 p-0 font-bold text-xs transition-all rounded-lg flex items-center justify-center relative",
            "hover:bg-orange-50 hover:text-orange-600 active:scale-95"
          ),
          selected: "bg-[#FF8C00] text-white hover:bg-[#FF8C00] hover:text-white focus:bg-[#FF8C00] focus:text-white rounded-lg font-black shadow-lg shadow-orange-100 border-none scale-100",
          today: "text-orange-500 font-bold underline decoration-2 underline-offset-4",
          outside: "text-gray-200 pointer-events-none opacity-30",
          disabled: "text-gray-200 pointer-events-none opacity-50",
          range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-3.5 w-3.5 stroke-[3px]" /> : <ChevronRight className="h-3.5 w-3.5 stroke-[3px]" />,
        }}
        modifiers={{
          hasEvent: eventDates,
        }}
        modifiersClassNames={{
          hasEvent: "after:content-[''] after:w-1 after:h-1 after:bg-orange-300 after:rounded-full after:absolute after:bottom-1",
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
