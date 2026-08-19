"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangePickerProps extends DateRangeValue {
  onChange: (value: DateRangeValue) => void;
  className?: string;
  buttonClassName?: string;
}

const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});

function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12);
}

function normalizeDate(date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = createDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number): Date {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonths(date: Date, amount: number): Date {
  return createDate(date.getFullYear(), date.getMonth() + amount, 1);
}

function endOfMonth(date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth() + 1, 0);
}

function createCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatDate(value: string): string {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : "";
}

function getPresets(today: Date): Array<{
  label: string;
  value: DateRangeValue;
}> {
  const dayOfWeek = today.getDay();
  const thisWeekStart = addDays(today, -(dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const thisMonthStart = startOfMonth(today);
  const previousMonth = addMonths(thisMonthStart, -1);
  const thisQuarterStart = createDate(
    today.getFullYear(),
    Math.floor(today.getMonth() / 3) * 3,
    1,
  );
  const previousQuarterStart = addMonths(thisQuarterStart, -3);
  const thisYearStart = createDate(today.getFullYear(), 0, 1);

  const range = (from: Date, to: Date): DateRangeValue => ({
    from: toDateValue(from),
    to: toDateValue(to),
  });

  return [
    { label: "Hôm nay", value: range(today, today) },
    { label: "Hôm qua", value: range(addDays(today, -1), addDays(today, -1)) },
    { label: "Tuần này", value: range(thisWeekStart, addDays(thisWeekStart, 6)) },
    {
      label: "Tuần trước",
      value: range(addDays(thisWeekStart, -7), addDays(thisWeekStart, -1)),
    },
    { label: "Tháng này", value: range(thisMonthStart, endOfMonth(today)) },
    {
      label: "Tháng trước",
      value: range(previousMonth, endOfMonth(previousMonth)),
    },
    {
      label: "Quý này",
      value: range(thisQuarterStart, addDays(addMonths(thisQuarterStart, 3), -1)),
    },
    {
      label: "Quý trước",
      value: range(previousQuarterStart, addDays(thisQuarterStart, -1)),
    },
    {
      label: "Năm nay",
      value: range(thisYearStart, createDate(today.getFullYear(), 11, 31)),
    },
    {
      label: "Năm trước",
      value: range(
        createDate(today.getFullYear() - 1, 0, 1),
        createDate(today.getFullYear() - 1, 11, 31),
      ),
    },
    { label: "Toàn bộ", value: { from: "", to: "" } },
  ];
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
  buttonClassName,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => normalizeDate(new Date()), []);
  const presets = useMemo(() => getPresets(today), [today]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseDate(from) ?? today),
  );

  useEffect(() => {
    if (!open) return;
    setVisibleMonth(startOfMonth(parseDate(from) ?? today));

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [from, open, today]);

  function handleDaySelect(date: Date) {
    const value = toDateValue(date);
    const selectedFrom = parseDate(from);

    if (!selectedFrom || to) {
      onChange({ from: value, to: "" });
      return;
    }

    if (date < selectedFrom) {
      onChange({ from: value, to: from });
    } else {
      onChange({ from, to: value });
    }
    setOpen(false);
  }

  function applyPreset(value: DateRangeValue) {
    onChange(value);
    setOpen(false);
  }

  const displayFrom = from ? formatDate(from) : "Từ ngày";
  const displayTo = to ? formatDate(to) : "Đến ngày";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Lọc theo khoảng thời gian"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm outline-none transition hover:border-slate-300 focus:border-brand-400",
          open && "border-brand-400",
          buttonClassName,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-slate-400" />
        <span className={cn("min-w-0 truncate", !from && "text-slate-400")}>
          {displayFrom}
        </span>
        <span className="shrink-0 text-slate-400">-</span>
        <span className={cn("min-w-0 truncate", !to && "text-slate-400")}>
          {displayTo}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Chọn khoảng thời gian"
          className="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100vh-7rem)] w-[min(680px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 md:grid-cols-[132px_minmax(0,1fr)]"
        >
          <div className="grid content-start grid-cols-2 gap-0.5 border-b border-slate-100 p-2 md:grid-cols-1 md:border-b-0 md:border-r">
            {presets.map((preset) => {
              const selected = preset.value.from === from && preset.value.to === to;
              return (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => applyPreset(preset.value)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1 text-left text-xs font-semibold transition",
                    selected
                      ? "bg-blue-50 font-bold text-brand-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    preset.label === "Toàn bộ" && "col-span-2 md:col-span-1",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid min-w-0 md:grid-cols-2">
            <CalendarMonth
              month={visibleMonth}
              today={today}
              from={from}
              to={to}
              onDaySelect={handleDaySelect}
              onPreviousMonth={() => setVisibleMonth((month) => addMonths(month, -1))}
              onPreviousYear={() => setVisibleMonth((month) => addMonths(month, -12))}
            />
            <CalendarMonth
              className="hidden border-l border-slate-100 md:block"
              month={addMonths(visibleMonth, 1)}
              today={today}
              from={from}
              to={to}
              onDaySelect={handleDaySelect}
              onNextMonth={() => setVisibleMonth((month) => addMonths(month, 1))}
              onNextYear={() => setVisibleMonth((month) => addMonths(month, 12))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarMonth({
  month,
  today,
  from,
  to,
  onDaySelect,
  onPreviousMonth,
  onPreviousYear,
  onNextMonth,
  onNextYear,
  className,
}: {
  month: Date;
  today: Date;
  from: string;
  to: string;
  onDaySelect: (date: Date) => void;
  onPreviousMonth?: () => void;
  onPreviousYear?: () => void;
  onNextMonth?: () => void;
  onNextYear?: () => void;
  className?: string;
}) {
  const days = createCalendarDays(month);
  const selectedFrom = parseDate(from);
  const selectedTo = parseDate(to);

  return (
    <div className={cn("min-w-0 p-3", className)}>
      <div className="grid h-8 grid-cols-[64px_minmax(0,1fr)_64px] items-center">
        <div className="flex">
          {onPreviousYear ? (
            <CalendarNavButton label="Năm trước" onClick={onPreviousYear}>
              <ChevronsLeft className="size-4" />
            </CalendarNavButton>
          ) : null}
          {onPreviousMonth ? (
            <CalendarNavButton label="Tháng trước" onClick={onPreviousMonth}>
              <ChevronLeft className="size-4" />
            </CalendarNavButton>
          ) : null}
        </div>
        <p className="truncate text-center text-[13px] font-bold capitalize text-slate-700">
          {monthFormatter.format(month)}
        </p>
        <div className="flex justify-end">
          {onNextMonth ? (
            <CalendarNavButton label="Tháng sau" onClick={onNextMonth}>
              <ChevronRight className="size-4" />
            </CalendarNavButton>
          ) : null}
          {onNextYear ? (
            <CalendarNavButton label="Năm sau" onClick={onNextYear}>
              <ChevronsRight className="size-4" />
            </CalendarNavButton>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 border-b border-slate-100 pb-2">
        {dayLabels.map((label) => (
          <span
            key={label}
            className="text-center text-[11px] font-semibold text-slate-400"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {days.map((date) => {
          const value = toDateValue(date);
          const outsideMonth = date.getMonth() !== month.getMonth();
          const isToday = value === toDateValue(today);
          const isStart = value === from;
          const isEnd = value === to;
          const inRange = Boolean(
            selectedFrom &&
              selectedTo &&
              date > selectedFrom &&
              date < selectedTo,
          );

          return (
            <button
              type="button"
              key={value}
              onClick={() => onDaySelect(date)}
              aria-label={dateFormatter.format(date)}
              aria-pressed={isStart || isEnd}
              className={cn(
                "h-8 min-w-0 text-xs font-semibold text-slate-500 outline-none transition hover:bg-blue-100 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-400",
                outsideMonth && "text-slate-300",
                isToday && !isStart && !isEnd && "text-brand-600 ring-1 ring-inset ring-blue-200",
                inRange && "bg-blue-50 text-brand-700",
                (isStart || isEnd) &&
                  "rounded-lg bg-brand-600 text-white hover:bg-brand-700 hover:text-white",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      {children}
    </button>
  );
}
