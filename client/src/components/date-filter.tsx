import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  onDateRangeChange: (range: DateRange | null) => void;
  currentRange?: DateRange | null;
}

export function DateFilter({ onDateRangeChange, currentRange }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(currentRange || null);

  const today = new Date();
  
  const presetRanges = [
    {
      label: 'Hari Ini',
      range: { 
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0), 
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      }
    },
    {
      label: '7 Hari Terakhir',
      range: { from: subDays(today, 6), to: today }
    },
    {
      label: '30 Hari Terakhir',
      range: { from: subDays(today, 29), to: today }
    },
    {
      label: 'Minggu Ini',
      range: { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
    },
    {
      label: 'Bulan Ini',
      range: { from: startOfMonth(today), to: endOfMonth(today) }
    },
    {
      label: 'Bulan Lalu',
      range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) }
    }
  ];

  const handlePresetSelect = (range: DateRange) => {
    setSelectedRange(range);
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleCustomDateSelect = (range: any) => {
    if (range?.from && range?.to) {
      const dateRange = { from: range.from, to: range.to };
      setSelectedRange(dateRange);
      onDateRangeChange(dateRange);
      setCustomDateOpen(false);
      setIsOpen(false);
    }
  };

  const handleClearFilter = () => {
    setSelectedRange(null);
    onDateRangeChange(null);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedRange) return 'Filter Tanggal';
    
    const { from, to } = selectedRange;
    if (format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd')) {
      return format(from, 'dd MMM yyyy');
    }
    return `${format(from, 'dd MMM')} - ${format(to, 'dd MMM yyyy')}`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2 flex items-center gap-1"
          data-testid="button-date-filter"
        >
          <Calendar size={16} className="text-gray-600 dark:text-gray-300" />
          {selectedRange && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {presetRanges.map((preset, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => handlePresetSelect(preset.range)}
            className="cursor-pointer"
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
        
        <div className="border-t border-gray-200 mt-1 pt-1">
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                Pilih Tanggal Custom
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                defaultMonth={selectedRange?.from}
                selected={selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined}
                onSelect={handleCustomDateSelect}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {selectedRange && (
          <div className="border-t border-gray-200 mt-1 pt-1">
            <DropdownMenuItem
              onClick={handleClearFilter}
              className="cursor-pointer text-red-600"
            >
              Hapus Filter
            </DropdownMenuItem>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}