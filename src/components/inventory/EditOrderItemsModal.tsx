/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { useEffect, useState } from "react";
import { Check, Loader2, Minus, Package2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatQuantity, formatPalletCount } from "@/lib/pallets";
import { fetchPurchaseSuggestionItems, patchOrderItems } from "@/lib/orders";
import type { ConvertSuggestionToOrderResponse, PurchaseSuggestionItem } from "@/types/inventory";

const toNum = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

interface EditableItem {
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  originalQuantity: number;
  quantity: number;
  editReason: string;
  quantityPerPallet: number;
  removed: boolean;
}

interface AddedItem {
  purchaseSuggestionItemId: string;
  productId: string;
  productName: string;
  sku: string;
  suggestedQuantity: number;
  quantity: number;
  editReason: string;
  quantityPerPallet: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  purchaseSuggestionId: string;
  currentItems: ConvertSuggestionToOrderResponse["items"];
  onSaved: (updated: ConvertSuggestionToOrderResponse) => void;
}

function QtyControl({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        size="icon"
        variant="outline"
        className="size-7"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
      >
        <Minus className="size-3" />
      </Button>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-16 h-7 text-center font-mono text-sm px-1"
        disabled={disabled}
      />
      <Button
        size="icon"
        variant="outline"
        className="size-7"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}

export function EditOrderItemsModal({
  open,
  onOpenChange,
  orderId,
  orderCode,
  purchaseSuggestionId,
  currentItems,
  onSaved,
}: Props) {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [availableItems, setAvailableItems] = useState<PurchaseSuggestionItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditableItems(
      currentItems.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        productName: item.productName ?? "Produto",
        sku: item.sku ?? "",
        originalQuantity: toNum(item.finalQuantity),
        quantity: toNum(item.finalQuantity),
        editReason: "",
        quantityPerPallet: toNum(item.quantityPerPallet),
        removed: false,
      })),
    );
    setAddedItems([]);
  }, [open, currentItems]);

  useEffect(() => {
    if (!open || !purchaseSuggestionId) return;
    let mounted = true;
    setLoadingAvailable(true);
    const existingProductIds = new Set(currentItems.map((i) => i.productId));
    fetchPurchaseSuggestionItems(purchaseSuggestionId)
      .then((items) => {
        if (!mounted) return;
        setAvailableItems(items.filter((i) => !existingProductIds.has(i.productId)));
      })
      .catch(() => {
        if (!mounted) return;
        setAvailableItems([]);
      })
      .finally(() => {
        if (mounted) setLoadingAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, purchaseSuggestionId, currentItems]);

  const updateQty = (orderItemId: string, qty: number) =>
    setEditableItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );

  const updateReason = (orderItemId: string, reason: string) =>
    setEditableItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, editReason: reason } : i)),
    );

  const toggleRemove = (orderItemId: string) =>
    setEditableItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, removed: !i.removed } : i)),
    );

  const addFromSuggestion = (item: PurchaseSuggestionItem) => {
    const suggested =
      toNum(item.finalQuantity ?? item.quantity ?? item.finalSuggestion) || 1;
    setAddedItems((prev) => [
      ...prev,
      {
        purchaseSuggestionItemId: item.id,
        productId: item.productId,
        productName: item.productName ?? "Produto",
        sku: item.sku ?? "",
        suggestedQuantity: suggested,
        quantity: suggested,
        editReason: "",
        quantityPerPallet: toNum(item.quantityPerPallet),
      },
    ]);
    setAvailableItems((prev) => prev.filter((a) => a.id !== item.id));
  };

  const removeAdded = (productId: string) => {
    const found = addedItems.find((i) => i.productId === productId);
    if (found) {
      setAvailableItems((prev) => [
        ...prev,
        {
          id: found.purchaseSuggestionItemId,
          productId: found.productId,
          productName: found.productName,
          sku: found.sku,
          finalQuantity: found.suggestedQuantity,
          quantityPerPallet: found.quantityPerPallet,
        },
      ]);
    }
    setAddedItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateAddedQty = (productId: string, qty: number) =>
    setAddedItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );

  const updateAddedReason = (productId: string, reason: string) =>
    setAddedItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, editReason: reason } : i)),
    );

  const validate = (): string | null => {
    const kept = editableItems.filter((i) => !i.removed);
    if (kept.length + addedItems.length === 0) return "O pedido deve ter pelo menos 1 item.";

    for (const item of kept) {
      if (item.quantity !== item.originalQuantity && !item.editReason.trim()) {
        return `Informe o motivo da alteração para "${item.productName}".`;
      }
    }
    for (const item of addedItems) {
      if (item.quantity !== item.suggestedQuantity && !item.editReason.trim()) {
        return `Informe o motivo da quantidade diferente do sugerido para "${item.productName}".`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (submitting) return;
    const error = validate();
    if (error) {
      toast.error("Verifique os dados", { description: error });
      return;
    }

    const kept = editableItems.filter((i) => !i.removed);
    const payload = {
      items: [
        ...kept.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          ...(item.quantity !== item.originalQuantity ? { editReason: item.editReason } : {}),
        })),
        ...addedItems.map((item) => ({
          purchaseSuggestionItemId: item.purchaseSuggestionItemId,
          productId: item.productId,
          quantity: item.quantity,
          ...(item.quantity !== item.suggestedQuantity ? { editReason: item.editReason } : {}),
        })),
      ],
    };

    setSubmitting(true);
    try {
      const updated = await patchOrderItems(orderId, payload);
      toast.success("Pedido atualizado", {
        description: "Itens salvos e pallets recalculados com sucesso.",
      });
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao salvar", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const keptItems = editableItems.filter((i) => !i.removed);
  const removedCount = editableItems.filter((i) => i.removed).length;
  const hasChanges =
    removedCount > 0 ||
    addedItems.length > 0 ||
    editableItems.some((i) => !i.removed && i.quantity !== i.originalQuantity);

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="flex h-[92dvh] max-w-3xl flex-col overflow-hidden border-border bg-surface-1 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-target/30 bg-target/10">
              <RefreshCw className="size-4 text-target" />
            </div>
            <div>
              <DialogTitle className="text-base">Editar itens do pedido</DialogTitle>
              <DialogDescription className="text-xs">
                Order {orderCode} · Ao salvar, pallets e demandas são recalculados automaticamente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
          {/* Current Items */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Itens do pedido ({keptItems.length} de {editableItems.length})
              </span>
              {removedCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-critical/30 bg-critical/10 text-critical text-[10px] font-mono"
                >
                  {removedCount} {removedCount === 1 ? "será removido" : "serão removidos"}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {editableItems.map((item) => {
                const qtyChanged = !item.removed && item.quantity !== item.originalQuantity;
                const palletCount =
                  !item.removed && item.quantityPerPallet > 0
                    ? item.quantity / item.quantityPerPallet
                    : null;

                return (
                  <div
                    key={item.orderItemId}
                    className={`rounded-md border p-3 transition-all ${
                      item.removed
                        ? "border-critical/20 bg-critical/5 opacity-50"
                        : "border-border bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded bg-accent border border-border">
                        <Package2 className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.productName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {item.sku}
                          {!item.removed && item.quantityPerPallet > 0 && (
                            <> · {formatQuantity(item.quantityPerPallet)} un/pallet</>
                          )}
                        </div>
                      </div>

                      {!item.removed && (
                        <>
                          <QtyControl
                            value={item.quantity}
                            onChange={(qty) => updateQty(item.orderItemId, qty)}
                          />
                          {palletCount !== null && (
                            <div className="w-16 text-right shrink-0">
                              <div className="font-mono text-xs tabular-nums">
                                {formatPalletCount(palletCount)} pl
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {item.removed && (
                        <span className="text-[11px] text-critical font-mono shrink-0">removido</span>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className={`size-7 shrink-0 transition-colors ${
                          item.removed
                            ? "border border-ok/30 text-ok hover:bg-ok/10"
                            : "text-muted-foreground hover:text-critical hover:bg-critical/10"
                        }`}
                        onClick={() => toggleRemove(item.orderItemId)}
                        title={item.removed ? "Restaurar item" : "Remover item"}
                        disabled={submitting}
                      >
                        {item.removed ? <Plus className="size-3" /> : <Trash2 className="size-3" />}
                      </Button>
                    </div>

                    {qtyChanged && (
                      <div className="mt-2.5 pl-12">
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Motivo da alteração{" "}
                          <span className="text-critical">*</span>
                          <span className="ml-1 normal-case tracking-normal text-muted-foreground/60">
                            ({formatQuantity(item.originalQuantity)} → {formatQuantity(item.quantity)} un)
                          </span>
                        </div>
                        <Textarea
                          value={item.editReason}
                          onChange={(e) => updateReason(item.orderItemId, e.target.value)}
                          placeholder="Descreva o motivo da alteração de quantidade..."
                          className="bg-surface-1 border-border text-sm min-h-[52px] resize-none"
                          rows={2}
                          disabled={submitting}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Added Items */}
          {addedItems.length > 0 && (
            <section>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ok">
                Adicionados ({addedItems.length})
              </div>
              <div className="space-y-2">
                {addedItems.map((item) => {
                  const qtyChanged = item.quantity !== item.suggestedQuantity;
                  const palletCount =
                    item.quantityPerPallet > 0 ? item.quantity / item.quantityPerPallet : null;

                  return (
                    <div
                      key={item.productId}
                      className="rounded-md border border-ok/25 bg-ok/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded bg-ok/10 border border-ok/25">
                          <Plus className="size-4 text-ok" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.productName}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {item.sku} · sugerido {formatQuantity(item.suggestedQuantity)} un
                          </div>
                        </div>

                        <QtyControl
                          value={item.quantity}
                          onChange={(qty) => updateAddedQty(item.productId, qty)}
                          disabled={submitting}
                        />

                        {palletCount !== null && (
                          <div className="w-16 text-right shrink-0">
                            <div className="font-mono text-xs tabular-nums">
                              {formatPalletCount(palletCount)} pl
                            </div>
                          </div>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0 text-muted-foreground hover:text-critical hover:bg-critical/10"
                          onClick={() => removeAdded(item.productId)}
                          title="Remover da lista"
                          disabled={submitting}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>

                      {qtyChanged && (
                        <div className="mt-2.5 pl-12">
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Motivo da quantidade diferente do sugerido{" "}
                            <span className="text-critical">*</span>
                          </div>
                          <Textarea
                            value={item.editReason}
                            onChange={(e) => updateAddedReason(item.productId, e.target.value)}
                            placeholder={`Qtd sugerida era ${formatQuantity(item.suggestedQuantity)} un...`}
                            className="bg-surface-1 border-border text-sm min-h-[52px] resize-none"
                            rows={2}
                            disabled={submitting}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available from Suggestion */}
          {(loadingAvailable || availableItems.length > 0) && (
            <section>
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Disponíveis para adicionar da sugestão</span>
                {loadingAvailable && <Loader2 className="size-3 animate-spin" />}
              </div>

              {!loadingAvailable && availableItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Todos os produtos da sugestão já estão no pedido.
                </p>
              )}

              {!loadingAvailable && availableItems.length > 0 && (
                <div className="space-y-1.5">
                  {availableItems.map((item) => {
                    const suggested = toNum(item.finalQuantity ?? item.quantity ?? item.finalSuggestion);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2.5 hover:border-target/30 transition-colors"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-accent">
                          <Package2 className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.productName ?? "Produto"}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {item.sku ?? ""}
                            {suggested > 0 && <> · sugerido {formatQuantity(suggested)} un</>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 gap-1.5 text-xs border-ok/30 text-ok hover:bg-ok/10 hover:border-ok/50"
                          onClick={() => addFromSuggestion(item)}
                          disabled={submitting}
                        >
                          <Plus className="size-3" />
                          Adicionar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-surface-2 px-6 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="font-mono text-xs text-muted-foreground">
              {keptItems.length} mantido{keptItems.length !== 1 ? "s" : ""}
              {removedCount > 0 && (
                <span className="text-critical">
                  {" "}· {removedCount} removido{removedCount !== 1 ? "s" : ""}
                </span>
              )}
              {addedItems.length > 0 && (
                <span className="text-ok">
                  {" "}· {addedItems.length} adicionado{addedItems.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                className="bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
                onClick={handleSave}
                disabled={submitting || !hasChanges}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
