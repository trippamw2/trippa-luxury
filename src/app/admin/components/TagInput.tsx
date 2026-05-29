"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Props ───────────────────────────────────────────── */
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  suggestions?: string[];
  disabled?: boolean;
}

/* ─── Component ───────────────────────────────────────── */
export function TagInput({
  value, onChange, label, error,
  placeholder = "Type and press Enter...",
  suggestions = [], disabled,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  );

  const inputId = `tag-input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 px-3 py-2 border bg-white transition-colors cursor-text min-h-[42px]",
          "focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
          error ? "border-red-300" : "border-sand-light",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-soft-black text-xs font-medium rounded-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              disabled={disabled}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[80px] border-0 outline-none text-sm bg-transparent p-0"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="border border-sand-light bg-white shadow-lg max-h-32 overflow-y-auto z-10">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className="block w-full text-left px-3 py-1.5 text-sm text-soft-black hover:bg-warm-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
