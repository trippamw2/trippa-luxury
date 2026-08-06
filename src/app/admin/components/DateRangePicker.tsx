"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/* ─── Props ───────────────────────────────────────────── */
interface DateRangePickerProps {
  startValue: string;
  endValue: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  error?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
}

/* ─── Component ───────────────────────────────────────── */
export function DateRangePicker({
  startValue, endValue, onChange, label, error,
  startPlaceholder = "Start date", endPlaceholder = "End date",
  disabled,
}: DateRangePickerProps) {
  const inputId = useId();

  return (
    <div className="space-y-0.5">
      {label && (
        <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-earth/70 uppercase tracking-wider mb-0.5">{startPlaceholder}</label>
          <input
            id={inputId}
            type="date"
            value={startValue}
            onChange={(e) => onChange(e.target.value, endValue)}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2.5 border text-sm bg-white transition-colors",
              "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
              error ? "border-red-300" : "border-sand-light",
            )}
          />
        </div>
        <div>
          <label className="block text-[10px] text-earth/70 uppercase tracking-wider mb-0.5">{endPlaceholder}</label>
          <input
            type="date"
            value={endValue}
            onChange={(e) => onChange(startValue, e.target.value)}
            disabled={disabled}
            min={startValue}
            className={cn(
              "w-full px-3 py-2.5 border text-sm bg-white transition-colors",
              "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
              error ? "border-red-300" : "border-sand-light",
            )}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
