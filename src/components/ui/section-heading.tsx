import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}

export function SectionHeading({
  label,
  title,
  subtitle,
  align = "center",
  light = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {label && (
        <span
          className={cn(
            "inline-block text-xs font-medium tracking-[0.2em] uppercase mb-3",
            light ? "text-gold-light" : "text-gold"
          )}
        >
          {label}
        </span>
      )}
      {label && <span className="diamond-accent mb-6" />}
      <h2
        className={cn(
          "text-3xl md:text-4xl lg:text-5xl font-heading font-medium leading-tight",
          light ? "text-cream" : "text-soft-black"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-base md:text-lg leading-relaxed max-w-2xl",
            align === "center" && "mx-auto",
            light ? "text-earth-light" : "text-earth"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
