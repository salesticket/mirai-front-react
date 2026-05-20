import { AlertTriangle, Package2, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProductStatusBadge } from "./ProductStatusBadge";
import type { ComputedRow } from "@/types/inventory";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ComputedRow[];
}

export function OrderReviewDrawer({ open, onOpenChange, rows }: Props) {
  const [note, setNote] = useState("");

  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = new Intl.NumberFormat("pt-BR");

  const totalUnits = rows.reduce((s, r) => s + r.suggestion.editedSuggestion, 0);
  const totalValue = rows.reduce((s, r) => s + r.suggestion.editedSuggestion * r.product.unitPrice, 0);
  const totalPallets = rows.reduce(
    (s, r) => s + (r.product.unitsPerPallet > 0 ? r.suggestion.editedSuggestion / r.product.unitsPerPallet : 0),
    0,
  );
  const supplierShort = rows.filter((r) => r.suggestion.editedSuggestion > r.product.availableSupplierStock);

  const confirm = () => {
    toast.success("Pedido enviado ao fornecedor", {
      description: `${rows.length} produtos · ${fmtBRL.format(totalValue)}`,
    });
    onOpenChange(false);
    setNote("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-surface-1 border-border p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-lg">Resumo do Pedido</SheetTitle>
          <SheetDescription>
            Revise os produtos selecionados e ajuste quantidades antes de confirmar.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {supplierShort.length > 0 && (
            <div className="m-6 mb-0 p-3 border border-critical/30 bg-critical/10 rounded-md flex gap-2 text-xs">
              <AlertTriangle className="size-4 text-critical shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-critical mb-0.5">Atenção: estoque do fornecedor insuficiente</div>
                <div className="text-muted-foreground">
                  {supplierShort.length} {supplierShort.length === 1 ? "produto possui" : "produtos possuem"} sugestão
                  acima do disponível no fornecedor.
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 space-y-2">
            {rows.map(({ product, suggestion }) => {
              const value = suggestion.editedSuggestion * product.unitPrice;
              const adjusted = suggestion.editedSuggestion !== suggestion.finalSuggestion;
              return (
                <div
                  key={product.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border bg-surface-2"
                >
                  <div className="size-10 rounded bg-accent border border-border flex items-center justify-center shrink-0">
                    <Package2 className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <ProductStatusBadge priority={suggestion.priority} />
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {product.sku} · pallet {product.unitsPerPallet} un
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Sugerido <span className="font-mono text-foreground">{suggestion.finalSuggestion}</span>
                      {adjusted && (
                        <>
                          {" · "}Ajustado <span className="font-mono text-target">{suggestion.editedSuggestion}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold tabular-nums text-sm">
                      {fmtNum.format(suggestion.editedSuggestion)} un
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                      {fmtBRL.format(value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 pb-4">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
              Observações
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Adicione observações sobre prazos, prioridades ou condições especiais…"
              className="mt-2 bg-surface-2 border-border"
              rows={3}
            />
          </div>
        </div>

        <div className="border-t border-border bg-surface-2 px-6 py-4">
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Unidades</div>
              <div className="font-mono font-semibold tabular-nums text-base">{fmtNum.format(totalUnits)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Pallets</div>
              <div className="font-mono font-semibold tabular-nums text-base">{totalPallets.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Total</div>
              <div className="font-mono font-semibold tabular-nums text-base text-target">
                {fmtBRL.format(totalValue)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Voltar e Ajustar
            </Button>
            <Button
              className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              onClick={confirm}
            >
              <Check className="size-4" />
              Confirmar Pedido
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
