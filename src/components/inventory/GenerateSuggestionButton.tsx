import { Sparkles, RefreshCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  generated: boolean;
  loading: boolean;
  onGenerate: () => void;
  onRecalculate: () => void;
  totalSuggested: number;
  totalProducts: number;
}

export function GenerateSuggestionButton({
  generated,
  loading,
  onGenerate,
  onRecalculate,
  totalSuggested,
  totalProducts,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-surface-1 p-4 md:p-5",
        generated ? "border-target/40" : "border-border",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 pointer-events-none opacity-60",
          "bg-[radial-gradient(circle_at_top_left,hsl(var(--target)/0.18),transparent_60%)]",
        )}
      />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4">
        <div className="size-10 rounded-md bg-target/15 text-target flex items-center justify-center shrink-0">
          <Sparkles className="size-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Motor de Sugestão de Compra</h3>
            {generated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-ok px-2 py-0.5 rounded bg-ok/10 border border-ok/30">
                <CheckCircle2 className="size-3" />
                Gerada
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {generated
              ? `Recomendação gerada para ${totalProducts} produtos · ${totalSuggested.toLocaleString("pt-BR")} unidades sugeridas com base em giro de estoque, segurança e múltiplos logísticos.`
              : "Calcule sugestões determinísticas usando giro médio ponderado, estoque de segurança, dias de cobertura e arredondamento por pallet."}
          </p>
        </div>

        <div className="flex gap-2">
          {generated && (
            <Button variant="outline" size="sm" onClick={onRecalculate} disabled={loading} className="border-border">
              <RefreshCcw className="size-4" />
              Recalcular
            </Button>
          )}
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={loading}
            className="bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-elevated"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Calculando…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {generated ? "Gerar novamente" : "Gerar Sugestão de Compra"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
