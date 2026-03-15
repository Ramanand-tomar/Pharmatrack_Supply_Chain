import { STAGES, type Medicine } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { Check, Clock, Package, Factory, Truck, ShoppingCart, UserCheck, AlertCircle } from "lucide-react";

interface ProductTimelineProps {
  medicine: Medicine;
  className?: string;
}

const STAGE_ICONS = [Package, Factory, Truck, ShoppingCart, UserCheck];

export function ProductTimeline({ medicine, className }: ProductTimelineProps) {
  const currentStage = medicine.stage;

  const getStageInfo = (i: number) => {
    const times = [
      medicine.rmsSupplyTime,
      medicine.manufactureTime,
      medicine.distributionTime,
      medicine.retailTime,
      medicine.soldTime
    ];
    return {
      time: times[i],
      isCompleted: i < currentStage || (i === 4 && currentStage === 5), // Sold is final
      isCurrent: i === currentStage && currentStage < 5,
    };
  };

  return (
    <div className={cn("space-y-0", className)}>
      {STAGE_ICONS.map((Icon, i) => {
        const { time, isCompleted, isCurrent } = getStageInfo(i);
        const stageName = STAGES[i + 1] || "Unknown"; // STAGES[0] is Created, but timeline starts from RMS
        
        return (
          <div key={i} className="relative pl-8 pb-8 last:pb-0">
            {/* Connector Line */}
            {i < STAGE_ICONS.length - 1 && (
              <div 
                className={cn(
                  "absolute left-[15px] top-[30px] bottom-0 w-[2px] transition-colors duration-500",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} 
              />
            )}
            
            {/* Icon Bubble */}
            <div 
              className={cn(
                "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-2",
                isCompleted ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : 
                isCurrent ? "bg-background border-primary text-primary animate-pulse-glow" : 
                "bg-background border-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            
            {/* Content */}
            <div className={cn(
              "transition-opacity duration-500",
              !isCompleted && !isCurrent ? "opacity-40" : "opacity-100"
            )}>
              <div className="flex justify-between items-start">
                <h4 className={cn(
                  "font-display font-bold text-sm md:text-base",
                  isCurrent ? "text-primary" : "text-foreground"
                )}>
                  {stageName}
                </h4>
                {time > 0 && (
                  <span className="text-[10px] md:text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                    {new Date(time * 1000).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isCompleted ? `Completed at ${new Date(time * 1000).toLocaleDateString()}` : 
                 isCurrent ? "In Progress" : "Awaiting this stage"}
              </p>
              
              {/* Additional details based on stage */}
              {isCompleted && (
                <div className="mt-2 text-[10px] space-y-1">
                  {i === 0 && <p>RMS ID: {medicine.RMSid}</p>}
                  {i === 1 && <p>Manufacturer ID: {medicine.MANid}</p>}
                  {i === 2 && <p>Distributor ID: {medicine.DISid}</p>}
                  {i === 3 && <p>Retailer ID: {medicine.RETid}</p>}
                  {i === 4 && (
                    <div className="flex items-center gap-2">
                      <span>Rating: {"⭐".repeat(medicine.rating)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
