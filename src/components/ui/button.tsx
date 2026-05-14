import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium tracking-[0.15em] uppercase transition-all duration-500";

  const sizeStyles = {
    sm: "px-5 py-2.5 text-xs",
    md: "px-8 py-3.5 text-sm",
    lg: "px-10 py-4 text-sm",
  };

  const variantStyles = {
    primary:
      "bg-soft-black text-cream hover:bg-soft-black-light",
    secondary:
      "bg-cream text-soft-black hover:bg-warm-white",
    outline:
      "border border-soft-black text-soft-black hover:bg-soft-black hover:text-cream",
    gold:
      "bg-gold text-soft-black hover:bg-gold-dark",
    ghost:
      "text-soft-black hover:text-gold-dark",
  };

  const classes = cn(baseStyles, sizeStyles[size], variantStyles[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(classes, disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}
