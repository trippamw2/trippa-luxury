import Link from "next/link";
import { Plus, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-warm-white border border-sand-light/50 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-gold" />
        </div>
      )}
      <h3 className="text-lg font-heading font-semibold text-soft-black mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-earth max-w-xs mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
