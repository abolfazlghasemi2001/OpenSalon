import { useState, useRef, useEffect } from "preact/hooks";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-preact";
import { Button } from "./button";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  formatJalaliDate,
  getJalaliMonthLength,
  jalaliToGregorian,
  jalaliToIsoDate,
  parseToJalali,
  toPersianDigits,
} from "@/lib/format";
import { today } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface JalaliDatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (newDate: string) => void;
  className?: string;
  disabled?: boolean;
}

export function JalaliDatePicker({ id, value, onChange, className, disabled }: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentJalali = parseToJalali(value || today()) || { jy: 1405, jm: 7, jd: 7 };
  const [viewYear, setViewYear] = useState(currentJalali.jy);
  const [viewMonth, setViewMonth] = useState(currentJalali.jm);

  useEffect(() => {
    const parsed = parseToJalali(value);
    if (parsed) {
      setViewYear(parsed.jy);
      setViewMonth(parsed.jm);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = getJalaliMonthLength(viewYear, viewMonth);
  const firstDayGreg = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDayJs = new Date(firstDayGreg.gy, firstDayGreg.gm - 1, firstDayGreg.gd, 12);
  // In JS: 0=Sun, 1=Mon, ..., 6=Sat. In Persian calendar: 0=Sat, 1=Sun, ..., 6=Fri
  const startOffset = (firstDayJs.getDay() + 1) % 7;

  const todayIso = today();

  const selectDay = (jd: number) => {
    const iso = jalaliToIsoDate(viewYear, viewMonth, jd);
    onChange(iso);
    setOpen(false);
  };

  const selectToday = () => {
    onChange(todayIso);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-right text-sm ring-offset-background transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate font-medium">{formatJalaliDate(value, "full")}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} title="ماه قبل">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="text-sm font-bold">
              {JALALI_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} title="ماه بعد">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
            {JALALI_WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const iso = jalaliToIsoDate(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                        ? "border border-primary/60 bg-primary/10 text-primary"
                        : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={selectToday}>
              برو به امروز ({formatJalaliDate(todayIso, "short")})
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
