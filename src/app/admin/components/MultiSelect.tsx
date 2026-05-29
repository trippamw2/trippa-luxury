"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Props ───────────────────────────────────────────── */
interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

/* ─── Component ───────────────────────────────────────── */
export function MultiSelect({
  value, onChange, options, label, error,
  placeholder = "Select...", disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (val: string) => {
    onChange(
      value.includes(val)
        ? value.filter((v) => v !== val)
        : [...value, val],
    );
  };

  const remove = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label || v)
    .join(", ");

  const inputId = `ms-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="space-y-0.5" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          id={inputId}
          type="button"
          onClick={() => { if (!disabled) setOpen(!open); }}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 border bg-white text-sm transition-colors text-left",
            "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
            error ? "border-red-300" : "border-sand-light",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span className={cn("flex-1 truncate", !value.length && "text-earth/60")}>
            {value.length ? selectedLabels : placeholder}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-earth transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full border border-sand-light bg-white shadow-lg max-h-60 flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-sand-light">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 border border-sand-light text-sm focus:outline-none focus:border-gold"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-earth/60 text-center">No options found</p>
              ) : (
                filtered.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-soft-black hover:bg-warm-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(opt.value)}
                      onChange={() => toggle(opt.value)}
                      className="accent-gold"
                    />
                    {opt.label}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {value.map((v) => {
            const label = options.find((o) => o.value === v)?.label || v;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-soft-black text-xs font-medium rounded-sm"
              >
                {label}
                <button type="button" onClick={() => remove(v)} disabled={disabled} className="hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
