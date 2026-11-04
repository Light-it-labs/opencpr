type StepIndicatorProps = {
  currentStepIndex: number;
  totalSteps: number;
};

export const StepIndicator = ({ currentStepIndex, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <div
            aria-current={isActive ? "step" : undefined}
            aria-label={`Step ${index + 1} of ${totalSteps}`}
            className="h-2 w-12 rounded-full transition-all data-[active=true]:bg-primary data-[completed=true]:bg-primary/40 data-[upcoming=true]:bg-primary/10"
            data-active={isActive}
            data-completed={isCompleted}
            data-upcoming={!isActive && !isCompleted}
            key={index}
          />
        );
      })}
    </div>
  );
};
