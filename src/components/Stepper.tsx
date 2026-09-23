import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="flex items-center">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <li key={label} className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete
                    ? "bg-brand-500 text-white"
                    : isCurrent
                      ? "border-2 border-brand-500 text-brand-600"
                      : "border border-black/10 text-ink-muted"
                }`}
              >
                {isComplete ? <Check size={14} /> : stepNumber}
              </span>
              <span className={`text-sm font-medium ${isCurrent ? "text-ink" : "text-ink-muted"}`}>{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-3 h-px flex-1 ${isComplete ? "bg-brand-500" : "bg-black/10"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
