import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { Sparkles, AlertTriangle, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComputedRow } from "@/types/inventory";
import { formatPalletCount, formatQuantity, getLoadingPointLabel } from "@/lib/pallets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ComputedRow | null;
  onAskAi: () => void;
}

export function ProductDetailsDrawer({ open, onOpenChange, row, onAskAi }: Props) {
  if (!row) return null;
  const { product, suggestion } = row;
  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const Stat = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) => (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={"text-base font-mono font-semibold tabular-nums mt-1 " + (accent ?? "")}>{value}</div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-surface-1 border-border p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded bg-accent border border-border flex items-center justify-center shrink-0">
              <Package2 className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate">{product.name}</SheetTitle>
              <SheetDescription className="font-mono text-[11px]">
                {product.sku} · {product.branchName} · {product.category}
              </SheetDescription>
            </div>
            <ProductStatusBadge priority={suggestion.priority} size="md" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
          {suggestion.supplierShort && (
            <div className="p-3 border border-critical/30 bg-critical/10 rounded-md flex gap-2 text-xs">
              <AlertTriangle className="size-4 text-critical shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-critical mb-0.5">Estoque insuficiente no fornecedor</div>
                <div className="text-muted-foreground">
                  Sugestão de {formatQuantity(suggestion.editedSuggestion)} un, disponível apenas{" "}
                  {formatQuantity(product.availableSupplierStock)} un.
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">Telemetria</h4>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Estoque atual" value={formatQuantity(product.currentStock)} />
              <Stat label="Estoque segurança" value={formatQuantity(product.safetyStock)} />
              <Stat
                label="Dias de cobertura"
                value={isFinite(suggestion.stockDays) ? `${suggestion.stockDays.toFixed(1)}d` : "—"}
                accent={
                  suggestion.stockDays < 3
                    ? "text-critical"
                    : suggestion.stockDays < 7
                      ? "text-attention"
                      : ""
                }
              />
              <Stat label="Giro médio" value={`${suggestion.averageTurnover.toFixed(1)}/d`} />
              <Stat label="Meta categoria" value={formatQuantity(product.categoryTarget)} />
              <Stat label="Múltiplo pallet" value={`${formatQuantity(product.unitsPerPallet)} un`} />
              <Stat label="Ponto carga" value={getLoadingPointLabel(product.loadingPoint)} />
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">Cálculo da sugestão</h4>
            <div className="bg-surface-2 border border-border rounded-md p-4 space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sugestão calculada</span>
                <span className="tabular-nums">{formatQuantity(suggestion.rawSuggestion)} un</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Múltiplo aplicado</span>
                <span className="tabular-nums">{formatQuantity(suggestion.multipleApplied)} un / pallet</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium">Sugestão final</span>
                <span className="tabular-nums text-target font-semibold">
                  {formatQuantity(suggestion.finalSuggestion)} un
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pallets estimados</span>
                <span className="tabular-nums">{formatPalletCount(suggestion.palletCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor estimado</span>
                <span className="tabular-nums">
                  {fmtBRL.format(suggestion.editedSuggestion * product.unitPrice)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">Justificativa</h4>
            <p className="text-sm leading-relaxed text-muted-foreground bg-surface-2 border border-border rounded-md p-4">
              {suggestion.reason}
            </p>
          </div>
        </div>

        <div className="border-t border-border bg-surface-2 px-6 py-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => {
              onOpenChange(false);
              onAskAi();
            }}
          >
            <Sparkles className="size-4" />
            Perguntar à IA
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
