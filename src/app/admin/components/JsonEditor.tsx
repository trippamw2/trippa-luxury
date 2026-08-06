"use client";

import { useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle } from "lucide-react";

/* ─── Props ───────────────────────────────────────────── */
interface JsonEditorProps {
  value: string;
  onChange: (json: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  minH?: string;
  disabled?: boolean;
  /** Attempt to format/validate on blur */
  validateOnBlur?: boolean;
}

/* ─── Component ───────────────────────────────────────── */
export function JsonEditor({
  value, onChange, label, error, placeholder = '{ "key": "value" }',
  minH = "160px", disabled, validateOnBlur = true,
}: JsonEditorProps) {
  const [valid, setValid] = useState<boolean | null>(null);

  const validate = useCallback((val: string) => {
    if (!val.trim()) { setValid(null); return; }
    try {
      JSON.parse(val);
      setValid(true);
    } catch {
      setValid(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (!validateOnBlur) validate(val);
  };

  const handleBlur = () => {
    if (validateOnBlur) validate(value);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setValid(true);
    } catch {
      setValid(false);
    }
  };

  const inputId = useId();

  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          className={cn(
            "w-full px-4 py-2.5 border text-sm font-mono bg-white transition-colors resize-y",
            "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
            valid === false ? "border-red-300" : valid === true ? "border-emerald-300" : "border-sand-light",
            error ? "border-red-300" : "",
          )}
          style={{ minHeight: minH }}
        />

        {/* Format button + status */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {valid === true && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {valid === false && <AlertCircle className="w-4 h-4 text-red-500" />}
          <button
            type="button"
            onClick={handleFormat}
            disabled={disabled || !value.trim()}
            title="Format JSON"
            className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-earth border border-sand-light bg-white hover:bg-warm-white transition-colors disabled:opacity-40"
          >
            Format
          </button>
        </div>
      </div>

      {(error || valid === false) && (
        <p className="text-xs text-red-500 mt-1">
          {error || (valid === false ? "Invalid JSON" : "")}
        </p>
      )}
    </div>
  );
}
