/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { AlertTriangle, Check, Loader2, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductStatusBadge } from "./ProductStatusBadge";
import type { ComputedRow, ConvertSuggestionToOrderResponse } from "@/types/inventory";
import { useState } from "react";
import { toast } from "sonner";
import {
  calculatePalletCount,
  formatPalletCount,
  formatQuantity,
  getLoadingPointLabel,
  getPalletTotalsByLoadingPoint,
} from "@/lib/pallets";
import { approvePurchaseSuggestion, convertSuggestionToOrder } from "@/lib/orders";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ComputedRow[];
  purchaseSuggestionId: string;
  purchaseSuggestionStatus: string;
  onConverted: (order: ConvertSuggestionToOrderResponse) => void;
}

const normalizeConversionError = (message: string) => {
  if (message.includes("Purchase suggestion must be approved")) {
    return "A sugestão precisa estar aprovada antes de gerar o pedido.";
  }

  if (message.includes("Manual quantity edit requires editReason")) {
    return "Informe o motivo da alteração manual antes de confirmar.";
  }

  if (message.includes("Purchase suggestion not found")) {
    return "A sugestão não foi encontrada ou não está mais disponível.";
  }

  return message;
};

export function OrderReviewDrawer({
  open,
  onOpenChange,
  rows,
  purchaseSuggestionId,
  purchaseSuggestionStatus,
  onConverted,
}: Props) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatRoundedPallets = (value: number) => formatQuantity(Math.round(value), 0);

  const totalUnits = rows.reduce((s, r) => s + r.suggestion.editedSuggestion, 0);
  const totalValue = rows.reduce((s, r) => s + r.suggestion.editedSuggestion * r.product.unitPrice, 0);
  const palletTotals = getPalletTotalsByLoadingPoint(rows);
  const supplierShort = rows.filter((r) => r.suggestion.editedSuggestion > r.product.availableSupplierStock);
  const adjustedRows = rows.filter((r) => r.suggestion.editedSuggestion !== r.suggestion.finalSuggestion);
  const loadingPointGroups = Array.from(
    rows
      .reduce(
        (groups, row) => {
          const key = row.product.loadingPoint?.id ? String(row.product.loadingPoint.id) : "unclassified";
          const current = groups.get(key) ?? {
            name: getLoadingPointLabel(row.product.loadingPoint),
            type: row.product.loadingPoint?.type ?? "N/A",
            products: 0,
            pallets: 0,
          };

          current.products += 1;
          current.pallets += calculatePalletCount(row.suggestion.editedSuggestion, row.product.unitsPerPallet);
          groups.set(key, current);
          return groups;
        },
        new Map<string, { name: string; type: string; products: number; pallets: number }>(),
      )
      .values(),
  );

  const confirm = async () => {
    if (!purchaseSuggestionId || submitting) return;

    const invalidQuantity = rows.find((row) => row.suggestion.editedSuggestion <= 0);
    if (invalidQuantity) {
      toast.error("Quantidade inválida", {
        description: `${invalidQuantity.product.sku} precisa ter quantidade maior que zero.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (purchaseSuggestionStatus !== "APROVADA") {
        await approvePurchaseSuggestion(purchaseSuggestionId);
      }

      const editReason = note.trim() || "Quantidade ajustada pelo comprador antes do fechamento";
      const order = await convertSuggestionToOrder(purchaseSuggestionId, {
        items: rows.map(({ product, suggestion }) => {
          const adjusted = suggestion.editedSuggestion !== suggestion.finalSuggestion;

          return {
            purchaseSuggestionItemId: suggestion.purchaseSuggestionItemId,
            productId: product.id,
            quantity: suggestion.editedSuggestion,
            ...(adjusted ? { editReason } : {}),
          };
        }),
      });

      onOpenChange(false);
      setNote("");
      onConverted(order);
    } catch (error) {
      toast.error("Não foi possível gerar o pedido", {
        description: normalizeConversionError(error instanceof Error ? error.message : "Tente novamente."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="flex h-[92dvh] max-w-5xl flex-col overflow-hidden border-border bg-surface-1 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-lg">Confirmar geração do pedido</DialogTitle>
          <DialogDescription>Revise os produtos selecionados antes de gerar a Order.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          {supplierShort.length > 0 && (
            <div className="mb-4 flex shrink-0 gap-2 rounded-md border border-critical/30 bg-critical/10 p-3 text-xs">
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

          <div className="grid shrink-0 grid-cols-2 gap-3 text-xs md:grid-cols-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Produtos</div>
              <div className="font-mono text-base font-semibold tabular-nums">{rows.length}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Unidades</div>
              <div className="font-mono text-base font-semibold tabular-nums">{formatQuantity(totalUnits)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pallets estimados
              </div>
              <div className="font-mono text-base font-semibold tabular-nums">
                {formatRoundedPallets(palletTotals.total)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Cheios estimados
              </div>
              <div className="font-mono text-base font-semibold tabular-nums">
                {formatRoundedPallets(palletTotals.simple)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Mistos estimados
              </div>
              <div className="font-mono text-base font-semibold tabular-nums">
                {formatRoundedPallets(palletTotals.mixed)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Valor estimado
              </div>
              <div className="font-mono text-base font-semibold tabular-nums text-target">
                {fmtBRL.format(totalValue)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
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
                        {product.sku} · pallet {formatQuantity(product.unitsPerPallet)} un
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {getLoadingPointLabel(product.loadingPoint)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Sugerido{" "}
                        <span className="font-mono text-foreground">{formatQuantity(suggestion.finalSuggestion)}</span>
                        {adjusted && (
                          <>
                            {" · "}Ajustado{" "}
                            <span className="font-mono text-target">
                              {formatQuantity(suggestion.editedSuggestion)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold tabular-nums text-sm">
                        {formatQuantity(suggestion.editedSuggestion)} un
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {formatRoundedPallets(
                          calculatePalletCount(suggestion.editedSuggestion, product.unitsPerPallet),
                        )}{" "}
                        pl
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {fmtBRL.format(value)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {adjustedRows.length > 0 && (
                <div className="pt-2">
                  <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
                    Motivo para ajustes manuais
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Descreva o motivo das quantidades alteradas."
                    className="mt-2 bg-surface-2 border-border"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
                Resumo estimado por ponto
              </div>
              {loadingPointGroups.map((group) => (
                <div key={`${group.name}-${group.type}`} className="rounded-md border border-border bg-surface-2 p-3">
                  <div className="text-sm font-medium">{group.name}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</div>
                      <div className="font-mono font-semibold">{group.type}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Produtos
                      </div>
                      <div className="font-mono font-semibold tabular-nums">{group.products}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Ocupação
                      </div>
                      <div className="font-mono font-semibold tabular-nums">
                        {formatRoundedPallets(group.pallets)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-surface-2 px-6 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
              onClick={confirm}
              disabled={submitting || rows.length === 0}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {submitting ? "Gerando pedido..." : "Confirmar pedido"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
