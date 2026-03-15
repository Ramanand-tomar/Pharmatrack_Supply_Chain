import { STAGES } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MedicineStageProgressProps {
  currentStage: number;
  className?: string;
}

export function MedicineStageProgress({ currentStage, className }: MedicineStageProgressProps) {
  return (
    <div className={cn("flex items-center w-full gap-1", className)}>
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentStage;
        const isCurrent = i === currentStage;

        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                  isCompleted && "bg-secondary border-secondary text-secondary-foreground",
                  isCurrent && "border-primary bg-primary/10 text-primary animate-pulse-glow",
                  !isCompleted && !isCurrent && "border-muted bg-muted/50 text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 text-center leading-tight max-w-[60px]",
                  isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 mt-[-14px]",
                  isCompleted ? "bg-secondary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
