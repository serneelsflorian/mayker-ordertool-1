import { Minus, Plus } from "lucide-react";
import Button from "./ui/Button";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  idSuffix: string;
}

/** Reusable −/value/+ stepper. Quantity is clamped to a minimum of 1 (AC5). */
export default function QuantityStepper({
  value,
  onChange,
  disabled = false,
  idSuffix,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        type="button"
        data-testid={`quantity-decrement-${idSuffix}`}
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" />
      </Button>
      <span
        data-testid={`quantity-value-${idSuffix}`}
        className="min-w-6 text-center text-sm font-medium"
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        type="button"
        data-testid={`quantity-increment-${idSuffix}`}
        aria-label="Increase quantity"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
