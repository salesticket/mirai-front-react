/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { AlertTriangle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatQuantity } from "@/lib/pallets";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  step: number; // logistic multiple (units per pallet)
  onChange: (next: number) => void;
  unitLabel?: string;
  className?: string;
  requireFullPallet?: boolean;
}

const isMultipleOfPallet = (value: number, step: number) => {
  if (value <= 0 || step <= 0) return true;
  const remainder = value % step;
  return Math.abs(remainder) < 0.000001 || Math.abs(remainder - step) < 0.000001;
};

export function SuggestionQuantityInput({
  value,
  step,
  onChange,
  unitLabel = "un",
  className,
  requireFullPallet = false,
}: Props) {
  const quantityStep = step > 0 ? step : 1;
  const dec = () => onChange(Math.max(0, value - quantityStep));
  const inc = () => onChange(value + quantityStep);
  const hasInvalidPalletQuantity = requireFullPallet && !isMultipleOfPallet(value, step);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-surface-2 p-0.5",
          hasInvalidPalletQuantity ? "border-attention/70" : "border-border",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 hover:bg-accent"
          onClick={dec}
          aria-label="Diminuir quantidade"
        >
          <Minus className="size-3.5" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          aria-invalid={hasInvalidPalletQuantity}
          className="w-16 h-7 border-0 bg-transparent text-center font-mono text-sm tabular-nums px-1 focus-visible:ring-0"
        />
        <span className="text-[10px] text-muted-foreground pr-1.5 uppercase tracking-wider">{unitLabel}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 hover:bg-accent"
          onClick={inc}
          aria-label="Aumentar quantidade"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      {hasInvalidPalletQuantity && (
        <div className="flex max-w-40 items-start gap-1 text-left text-[10px] leading-tight text-attention">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>Somente pallets cheios: use múltiplos de {formatQuantity(step)} un.</span>
        </div>
      )}
    </div>
  );
}
