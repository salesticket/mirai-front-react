import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";

interface Props {
  period: string;
  onPeriodChange: (p: string) => void;
}

const PERIODS = [
  { id: "1d", label: "1D" },
  { id: "7d", label: "7D" },
  { id: "15d", label: "15D" },
  { id: "30d", label: "30D" },
];

export function PageHeader({ period, onPeriodChange }: Props) {
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setUpdatedAt(new Date());
      setRefreshing(false);
    }, 700);
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 pb-6 border-b border-border">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-target px-2 py-0.5 border border-target/40 bg-target/10 rounded">
            OPERAÇÃO ATIVA
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
            <span className="size-1.5 rounded-full bg-ok animate-pulse-dot" />
            Sincronizado
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Gestão de Abastecimento</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Analise o giro de estoque, risco de ruptura e gere sugestões inteligentes de compra.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Última atualização</div>
          <div className="text-sm font-mono tabular-nums">{format(updatedAt, "dd/MM/yyyy HH:mm:ss")}</div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          className="border-border bg-surface-1 hover:bg-accent"
        >
          <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
          Atualizar
        </Button>

        <div className="inline-flex rounded-md border border-border bg-surface-1 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              className={
                "px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors " +
                (period === p.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
