import { cn } from "@/lib/utils";
import type { Priority } from "@/types/inventory";

interface Props {
  priority: Priority;
  className?: string;
  size?: "sm" | "md";
}

const LABEL: Record<Priority, string> = {
  critical: "Crítico",
  attention: "Atenção",
  target: "Meta",
  ok: "OK",
};

const STYLES: Record<Priority, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  attention: "bg-attention/15 text-attention border-attention/30",
  target: "bg-target/15 text-target border-target/30",
  ok: "bg-ok/15 text-ok border-ok/30",
};

export function ProductStatusBadge({ priority, className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border font-medium uppercase tracking-wider",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        STYLES[priority],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          priority === "critical" && "bg-critical animate-pulse-dot",
          priority === "attention" && "bg-attention",
          priority === "target" && "bg-target",
          priority === "ok" && "bg-ok",
        )}
      />
      {LABEL[priority]}
    </span>
  );
}
