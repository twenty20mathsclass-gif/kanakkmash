"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import { ChevronLeft, Search, Plus, List } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onToggleView?: () => void
  onSearch?: () => void
  onAdd?: () => void
  onBack?: () => void
  eventDates?: Date[]
  className?: string
}

export function CalendarView({
  selectedDate,
  onDateSelect,
  onToggleView,
  onSearch,
  onAdd,
  onBack,
  eventDates = [],
  className,
}: CalendarViewProps) {
  return (
    <div className={cn("flex flex-col w-full bg-white min-h-screen", className)}>
      {/* Premium Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="text-[#E5484D]">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <span className="text-2xl font-bold text-[#E5484D]">
            {format(selectedDate, "MMM yyyy")}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {onToggleView && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleView}
              className="bg-[#E5484D] text-white hover:bg-[#E5484D]/90 rounded-lg h-9 w-9"
            >
              <List className="h-5 w-5" />
            </Button>
          )}
          {onSearch && (
            <Button variant="ghost" size="icon" onClick={onSearch} className="text-[#E5484D]">
              <Search className="h-6 w-6" />
            </Button>
          )}
          {onAdd && (
            <Button variant="ghost" size="icon" onClick={onAdd} className="text-[#E5484D]">
              <Plus className="h-7 w-7" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="flex-1 p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          eventDates={eventDates}
          className="w-full"
          classNames={{
            month_caption: "hidden", // Hide the default caption since we have our custom header
          }}
        />
      </div>
    </div>
  )
}
