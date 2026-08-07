import { Fragment } from "react";
import { Plane, PlaneLanding, Car, Ship, MapPin, ArrowRight } from "lucide-react";
import type { TransferStep } from "@/lib/journey-routes";
import { cn } from "@/lib/utils";

const modeIcons: Record<TransferStep["mode"], typeof Plane> = {
  fly: Plane,
  drive: Car,
  boat: Ship,
};

function StepIcon({ step, className }: { step: TransferStep; className?: string }) {
  if (step.kind === "property") return <MapPin className={className} />;
  if (step.mode === "fly") {
    return step.duration === "International arrival" ? (
      <PlaneLanding className={className} />
    ) : (
      <Plane className={className} />
    );
  }
  const Icon = modeIcons[step.mode];
  return <Icon className={className} />;
}

/**
 * Vertical arrival timeline : one row per transfer leg, from the
 * international gateway to the property door. Used on property pages.
 */
export function TransferTimeline({
  steps,
  className,
}: {
  steps: TransferStep[];
  className?: string;
}) {
  return (
    <ol className={cn("relative", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={`${step.id}-${index}`} className="relative flex gap-5 pb-9 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[23px] top-12 bottom-0 w-px bg-sand-light/70"
              />
            )}
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-warm-white text-gold shadow-sm">
              <StepIcon step={step} className="w-5 h-5" />
            </div>
            <div className="pt-1.5 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">
                {step.duration}
                {step.code ? ` · ${step.code}` : ""}
              </p>
              <h4 className="mt-1 font-heading text-lg text-soft-black leading-snug">
                {step.label}
              </h4>
              {step.sublabel && (
                <p className="mt-0.5 text-xs text-earth/70">{step.sublabel}</p>
              )}
              {step.note && (
                <p className="mt-1.5 text-sm text-earth/90 leading-relaxed">{step.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Compact horizontal arrival chain : gateway chips joined by arrows.
 * Used on destination pages to show how guests reach each property.
 */
export function TransferChain({
  steps,
  className,
}: {
  steps: TransferStep[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, index) => (
        <Fragment key={`${step.id}-${index}`}>
          {index > 0 && <ArrowRight className="w-3.5 h-3.5 text-earth/40 shrink-0" />}
          <div className="flex items-center gap-2 rounded-full border border-sand-light/50 bg-warm-white px-3 py-1.5">
            <StepIcon step={step} className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="text-xs font-medium text-soft-black">{step.label}</span>
            {step.code && (
              <span className="text-[10px] font-semibold tracking-wider text-earth/70">
                {step.code}
              </span>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
