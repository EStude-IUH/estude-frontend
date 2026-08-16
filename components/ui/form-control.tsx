"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon: Icon, label, hint, error, ...props },
  ref,
) {
  const control = (
    <span className="relative block">
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      ) : null}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-blue-100",
          Icon && "pl-10",
          error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
          className,
        )}
        {...props}
      />
    </span>
  );

  if (!label && !hint && !error) return control;
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-bold text-slate-700">
          {label}
        </span>
      ) : null}
      {control}
      {error || hint ? (
        <span
          className={cn(
            "mt-1.5 block text-xs leading-5",
            error ? "text-rose-600" : "text-slate-400",
          )}
        >
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, label, children, ...props }, ref) {
    const control = (
      <span className="relative block">
        <select
          ref={ref}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-blue-100",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </span>
    );
    if (!label) return control;
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          {label}
        </span>
        {control}
      </label>
    );
  },
);

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
  placement?: "top" | "bottom";
  disabled?: boolean;
  ariaLabel?: string;
}

export function CustomSelect({
  value,
  options,
  onValueChange,
  placeholder = "Chọn giá trị",
  label,
  className,
  buttonClassName,
  placement = "bottom",
  disabled = false,
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
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
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? (
        <span
          id={labelId}
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          {label}
        </span>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-brand-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-brand-400 ring-4 ring-blue-100",
          buttonClassName,
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-slate-400")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180 text-brand-600",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 max-h-64 w-full min-w-max overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15",
            placement === "bottom"
              ? "left-0 top-full mt-2"
              : "bottom-full left-0 mb-2",
          )}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={selected}
                key={option.value}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-sm transition",
                  selected
                    ? "bg-brand-600 font-bold text-white"
                    : "text-slate-700 hover:bg-blue-50 hover:text-brand-700",
                )}
              >
                <span>{option.label}</span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
