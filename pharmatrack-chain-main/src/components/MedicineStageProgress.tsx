import { STAGES } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";

interface MedicineStageProgressProps {
  currentStage: number;
  isBatchRecalled?: boolean;
  className?: string;
}

export function MedicineStageProgress({ currentStage, isBatchRecalled, className }: MedicineStageProgressProps) {
  const isRecalled = currentStage === 6 || isBatchRecalled;

  return (
    <div className={cn("flex flex-col w-full gap-4", className)}>
      {isRecalled && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isBatchRecalled ? "Batch Recalled - Stop All Transitions" : "Medicine Recalled"}
          </span>
        </div>
      )}
      <div className="flex items-center w-full gap-1">
        {STAGES.map((stage, i) => {
          // If recalled, stages after the recall should be greyed out or special
          const isCompleted = isRecalled ? (i < currentStage && i < 6) : i < currentStage;
          const isCurrent = i === currentStage;
          const isRecallStage = i === 6;

          if (isRecallStage && !isRecalled) return null; // Don't show "Recalled" stage if not recalled

          return (
            <div key={stage} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                    isCompleted && "bg-secondary border-secondary text-secondary-foreground",
                    isCurrent && !isRecalled && "border-primary bg-primary/10 text-primary animate-pulse-glow",
                    isCurrent && isRecalled && "border-destructive bg-destructive/10 text-destructive",
                    !isCompleted && !isCurrent && "border-muted bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center leading-tight max-w-[60px]",
                    isCurrent ? (isRecalled ? "text-destructive font-bold" : "text-primary font-semibold") : "text-muted-foreground"
                  )}
                >
                  {stage}
                </span>
              </div>
              {i < STAGES.length - 1 && (STAGES[i+1] !== "Recalled" || isRecalled) && (
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
    </div>
  );
}
