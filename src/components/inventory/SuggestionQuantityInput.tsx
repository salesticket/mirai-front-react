import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  step: number; // logistic multiple (units per pallet)
  onChange: (next: number) => void;
  unitLabel?: string;
  className?: string;
}

export function SuggestionQuantityInput({ value, step, onChange, unitLabel = "un", className }: Props) {
  const dec = () => onChange(Math.max(0, value - step));
  const inc = () => onChange(value + step);

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5", className)}>
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
  );
}
