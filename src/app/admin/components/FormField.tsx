import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ─── Label ──────────────────────────────────────────── */
interface LabelProps {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  htmlFor?: string;
}

export function FormLabel({ children, className, required, htmlFor }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-xs font-medium text-earth uppercase tracking-wider mb-1.5", className)}
    >
      {children}
      {required && <span className="text-gold ml-0.5">*</span>}
    </label>
  );
}

/* ─── Error ──────────────────────────────────────────── */
interface ErrorProps {
  message?: string;
  className?: string;
}

export function FormError({ message, className }: ErrorProps) {
  if (!message) return null;
  return (
    <p className={cn("text-xs text-red-500 mt-1", className)}>{message}</p>
  );
}

/* ─── Input ──────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, required, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-0.5">
        {label && <FormLabel htmlFor={inputId} required={required}>{label}</FormLabel>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 lg:py-2.5 border text-sm bg-white transition-colors",
            "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
            error ? "border-red-300" : "border-sand-light",
            className
          )}
          required={required}
          {...props}
        />
        <FormError message={error} />
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

/* ─── Textarea ───────────────────────────────────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, required, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-0.5">
        {label && <FormLabel htmlFor={inputId} required={required}>{label}</FormLabel>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 lg:py-2.5 border text-sm bg-white transition-colors resize-y min-h-[80px]",
            "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
            error ? "border-red-300" : "border-sand-light",
            className
          )}
          required={required}
          {...props}
        />
        <FormError message={error} />
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";

/* ─── Select ─────────────────────────────────────────── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, required, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-0.5">
        {label && <FormLabel htmlFor={inputId} required={required}>{label}</FormLabel>}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 lg:py-2.5 border text-sm bg-white transition-colors",
            "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
            error ? "border-red-300" : "border-sand-light",
            className
          )}
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <FormError message={error} />
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

/* ─── Inline field group (side-by-side layout) ──────── */
export function FormGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      {children}
    </div>
  );
}
