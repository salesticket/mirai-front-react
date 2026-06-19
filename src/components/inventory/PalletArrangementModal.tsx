/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  Layers3,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { patchPalletArrangement } from "@/lib/orders";
import { formatQuantity } from "@/lib/pallets";
import type { ConvertSuggestionToOrderResponse, OrderLoadingPoint } from "@/types/inventory";

// ── Internal types ─────────────────────────────────────────────────────────────

type AItem = {
  orderItemId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  quantityPerPallet: number;
};

type APallet = {
  tempId: string;
  loadingPointId: number;
  items: AItem[];
};

type PoolProduct = {
  orderItemId: string;
  productId: string;
  sku: string;
  productName: string;
  loadingPointId: number;
  loadingPoint: OrderLoadingPoint;
  finalQuantity: number;
  quantityPerPallet: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const toNum = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

function palletOccupancy(items: AItem[]): number {
  return items.reduce((sum, i) => {
    if (i.quantityPerPallet <= 0) return sum;
    return sum + Math.round((i.quantity / i.quantityPerPallet) * 1000) / 10;
  }, 0);
}

function buildInitialPallets(order: ConvertSuggestionToOrderResponse): APallet[] {
  const qppMap = new Map(order.items.map((i) => [i.id, toNum(i.quantityPerPallet)]));
  return order.loadingPointDemands.flatMap((demand) =>
    (demand.pallets ?? []).map((pallet) => ({
      tempId: pallet.id,
      loadingPointId: demand.loadingPoint.id,
      items: pallet.items.map((item) => ({
        orderItemId: item.orderItemId,
        productId: item.productId,
        sku: item.sku ?? "",
        productName: item.productName ?? "",
        quantity: toNum(item.quantity),
        quantityPerPallet: qppMap.get(item.orderItemId) ?? 0,
      })),
    }))
  );
}

// ── DraggablePoolCard ──────────────────────────────────────────────────────────

function DraggablePoolCard({ product, freeQty }: { product: PoolProduct; freeQty: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: product.orderItemId,
    disabled: freeQty <= 0,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const fullyAllocated = freeQty === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-md border p-3 select-none transition-colors",
        isDragging && "opacity-40",
        fullyAllocated
          ? "border-border bg-surface-2 opacity-70 cursor-default"
          : "border-attention/40 bg-attention/5 cursor-grab active:cursor-grabbing hover:border-attention/60"
      )}
    >
      <div className="flex items-start gap-2">
        {!fullyAllocated && (
          <GripVertical className="size-4 mt-0.5 shrink-0 text-muted-foreground pointer-events-none" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {product.productName || product.sku}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">{product.sku}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="font-mono tabular-nums text-foreground">
                {formatQuantity(product.finalQuantity)}
              </span>{" "}
              un
            </span>
            {fullyAllocated ? (
              <span className="flex items-center gap-1 text-ok font-medium">
                <CheckCircle2 className="size-3" />
                Totalmente alocado
              </span>
            ) : (
              <span className="text-attention font-medium">
                Livres: {formatQuantity(freeQty)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DroppablePallet ────────────────────────────────────────────────────────────

function DroppablePallet({
  pallet,
  index,
  loadingPoint,
  allocatedQtyMap,
  poolProducts,
  onRemoveItem,
  onUpdateQty,
  onRemovePallet,
}: {
  pallet: APallet;
  index: number;
  loadingPoint: OrderLoadingPoint | undefined;
  allocatedQtyMap: Map<string, number>;
  poolProducts: PoolProduct[];
  onRemoveItem: (orderItemId: string, palletTempId: string) => void;
  onUpdateQty: (orderItemId: string, palletTempId: string, qty: number) => void;
  onRemovePallet: (tempId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pallet.tempId });

  const isMixed = loadingPoint?.type === "MIXED";
  const maxProducts = loadingPoint?.maxProductsPerMixedPallet ?? null;
  const atLimit = isMixed && maxProducts !== null && pallet.items.length >= maxProducts;
  const occupancy = palletOccupancy(pallet.items);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border transition-all",
        isOver
          ? "border-target bg-target/5 ring-1 ring-target/30"
          : atLimit
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-surface-2"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded",
              isMixed ? "bg-target/10 text-target" : "bg-ok/10 text-ok"
            )}
          >
            <Layers3 className={cn("size-3.5", !isMixed && "hidden")} />
            {!isMixed && (
              <span className="font-mono font-bold text-[10px]">
                #{String(index + 1).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-mono text-sm font-semibold">
              Pallet #{String(index + 1).padStart(2, "0")}
            </span>
            {isMixed && maxProducts && (
              <span
                className={cn(
                  "ml-2 font-mono text-[11px]",
                  atLimit ? "text-destructive font-semibold" : "text-muted-foreground"
                )}
              >
                {pallet.items.length}/{maxProducts} produtos
                {atLimit && " · limite atingido"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {occupancy.toFixed(1)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-destructive"
            onClick={() => onRemovePallet(pallet.tempId)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="h-1 mx-3 rounded-full bg-accent overflow-hidden">
        <div
          className="h-full bg-target rounded-full transition-all"
          style={{ width: `${Math.min(100, occupancy)}%` }}
        />
      </div>

      {/* Items */}
      <div className="p-2 space-y-1.5 min-h-14">
        {pallet.items.length === 0 && (
          <div className="flex items-center justify-center h-10 rounded border border-dashed border-border text-[11px] text-muted-foreground/60">
            Arraste produtos aqui
          </div>
        )}
        {pallet.items.map((item) => {
          const pool = poolProducts.find((p) => p.orderItemId === item.orderItemId);
          const totalAllocated = allocatedQtyMap.get(item.orderItemId) ?? 0;
          const finalQty = pool?.finalQuantity ?? totalAllocated;
          const freeQty = finalQty - totalAllocated;
          const maxQty = item.quantity + Math.max(0, freeQty);

          return (
            <div
              key={item.orderItemId}
              className="flex items-center gap-2 rounded px-2 py-1.5 bg-surface-1 border border-border/60 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium leading-tight">
                  {item.productName || item.sku}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">{item.sku}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="size-5 shrink-0"
                  onClick={() =>
                    onUpdateQty(item.orderItemId, pallet.tempId, Math.max(1, item.quantity - 1))
                  }
                  disabled={item.quantity <= 1}
                >
                  <Minus className="size-2.5" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={item.quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    onUpdateQty(
                      item.orderItemId,
                      pallet.tempId,
                      Math.min(maxQty, Math.max(1, v))
                    );
                  }}
                  className="h-6 w-14 px-1 text-center font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="size-5 shrink-0"
                  onClick={() =>
                    onUpdateQty(
                      item.orderItemId,
                      pallet.tempId,
                      Math.min(maxQty, item.quantity + 1)
                    )
                  }
                  disabled={item.quantity >= maxQty}
                >
                  <Plus className="size-2.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveItem(item.orderItemId, pallet.tempId)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PalletArrangementModal ─────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ConvertSuggestionToOrderResponse;
  onSaved: (updated: ConvertSuggestionToOrderResponse) => void;
}

export function PalletArrangementModal({ open, onOpenChange, order, onSaved }: Props) {
  const [pallets, setPallets] = useState<APallet[]>([]);
  const [activeLoadingPointId, setActiveLoadingPointId] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadingPoints = useMemo<OrderLoadingPoint[]>(() => {
    const seen = new Map<number, OrderLoadingPoint>();
    for (const item of order.items) {
      if (item.loadingPoint && !seen.has(item.loadingPoint.id)) {
        seen.set(item.loadingPoint.id, item.loadingPoint);
      }
    }
    // Fallback: derive from loadingPointDemands when item.loadingPoint is null
    for (const demand of order.loadingPointDemands) {
      if (!seen.has(demand.loadingPoint.id)) {
        seen.set(demand.loadingPoint.id, demand.loadingPoint);
      }
    }
    return Array.from(seen.values());
  }, [order]);

  // Derive loadingPoint from loadingPointDemands when item.loadingPoint is null.
  // The backend may not populate loadingPoint on order.items even though it's
  // always present on loadingPointDemands[n].pallets[n].items.
  const itemLPFallback = useMemo<Map<string, OrderLoadingPoint>>(() => {
    const map = new Map<string, OrderLoadingPoint>();
    for (const demand of order.loadingPointDemands) {
      for (const pallet of demand.pallets ?? []) {
        for (const palletItem of pallet.items) {
          if (!map.has(palletItem.orderItemId)) {
            map.set(palletItem.orderItemId, demand.loadingPoint);
          }
        }
      }
    }
    return map;
  }, [order]);

  const poolProducts = useMemo<PoolProduct[]>(() => {
    return order.items
      .map((item) => {
        const lp = item.loadingPoint ?? itemLPFallback.get(item.id) ?? null;
        if (!lp) return null;
        return {
          orderItemId: item.id,
          productId: item.productId,
          sku: item.sku ?? "",
          productName: item.productName ?? "",
          loadingPointId: lp.id,
          loadingPoint: lp,
          finalQuantity: toNum(item.finalQuantity),
          quantityPerPallet: toNum(item.quantityPerPallet),
        };
      })
      .filter((p): p is PoolProduct => p !== null);
  }, [order, itemLPFallback]);

  // Re-init when modal opens (intentionally omit order/loadingPoints from deps)
  useEffect(() => {
    if (!open) return;
    setPallets(buildInitialPallets(order));
    setApiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setActiveLoadingPointId(loadingPoints[0]?.id ?? 0);
  }, [open]);

  const allocatedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pallets) {
      for (const i of p.items) {
        map.set(i.orderItemId, (map.get(i.orderItemId) ?? 0) + i.quantity);
      }
    }
    return map;
  }, [pallets]);

  const getFreeQty = useCallback(
    (orderItemId: string, finalQty: number) =>
      finalQty - (allocatedQtyMap.get(orderItemId) ?? 0),
    [allocatedQtyMap]
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Check only visible pool products — items without a derivable loadingPoint
    // cannot be shown or managed in the UI and are handled in handleSave.
    const unallocated = poolProducts.filter(
      (p) => getFreeQty(p.orderItemId, p.finalQuantity) !== 0
    );
    if (unallocated.length > 0) {
      errors.push(`${unallocated.length} produto(s) com quantidade não totalmente alocada`);
    }

    if (pallets.some((p) => p.items.length === 0)) {
      errors.push("Pallets vazios não são permitidos");
    }

    if (pallets.some((p) => p.items.some((i) => i.quantity <= 0))) {
      errors.push("Quantidade deve ser maior que zero");
    }

    for (const pallet of pallets) {
      const lp = loadingPoints.find((l) => l.id === pallet.loadingPointId);
      if (lp?.type === "MIXED" && lp.maxProductsPerMixedPallet) {
        if (pallet.items.length > lp.maxProductsPerMixedPallet) {
          const localIdx = pallets
            .filter((p) => p.loadingPointId === pallet.loadingPointId)
            .indexOf(pallet);
          errors.push(
            `Pallet #${localIdx + 1} excede o limite de ${lp.maxProductsPerMixedPallet} produtos (${lp.name})`
          );
        }
      }
    }

    return errors;
  }, [poolProducts, pallets, getFreeQty, loadingPoints]);

  // ── Mutators ──────────────────────────────────────────────────────────────────

  const addToPallet = useCallback(
    (orderItemId: string, palletTempId: string, quantity: number) => {
      if (quantity <= 0) return;
      const pool = poolProducts.find((p) => p.orderItemId === orderItemId);
      if (!pool) return;
      setPallets((prev) =>
        prev.map((pallet) => {
          if (pallet.tempId !== palletTempId) return pallet;
          const existing = pallet.items.find((i) => i.orderItemId === orderItemId);
          if (existing) {
            return {
              ...pallet,
              items: pallet.items.map((i) =>
                i.orderItemId === orderItemId ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return {
            ...pallet,
            items: [
              ...pallet.items,
              {
                orderItemId,
                productId: pool.productId,
                sku: pool.sku,
                productName: pool.productName,
                quantity,
                quantityPerPallet: pool.quantityPerPallet,
              },
            ],
          };
        })
      );
    },
    [poolProducts]
  );

  const removeFromPallet = useCallback((orderItemId: string, palletTempId: string) => {
    setPallets((prev) =>
      prev.map((p) =>
        p.tempId === palletTempId
          ? { ...p, items: p.items.filter((i) => i.orderItemId !== orderItemId) }
          : p
      )
    );
  }, []);

  const updateItemQty = useCallback((orderItemId: string, palletTempId: string, qty: number) => {
    setPallets((prev) =>
      prev.map((p) =>
        p.tempId === palletTempId
          ? { ...p, items: p.items.map((i) => (i.orderItemId === orderItemId ? { ...i, quantity: qty } : i)) }
          : p
      )
    );
  }, []);

  const addNewPallet = useCallback(() => {
    setPallets((prev) => [
      ...prev,
      { tempId: `new-${Date.now()}`, loadingPointId: activeLoadingPointId, items: [] },
    ]);
  }, [activeLoadingPointId]);

  const removePallet = useCallback((tempId: string) => {
    setPallets((prev) => prev.filter((p) => p.tempId !== tempId));
  }, []);

  // ── Drag ──────────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setDragActiveId(String(active.id));
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setDragActiveId(null);
      if (!over) return;

      const orderItemId = String(active.id);
      const palletTempId = String(over.id);

      const product = poolProducts.find((p) => p.orderItemId === orderItemId);
      if (!product) return;

      const freeQty = getFreeQty(orderItemId, product.finalQuantity);
      if (freeQty <= 0) {
        toast.warning("Produto já totalmente alocado. Ajuste as quantidades em outros pallets primeiro.");
        return;
      }

      const targetPallet = pallets.find((p) => p.tempId === palletTempId);
      const lp = loadingPoints.find((l) => l.id === targetPallet?.loadingPointId);
      const alreadyInPallet = targetPallet?.items.some((i) => i.orderItemId === orderItemId);
      if (
        lp?.type === "MIXED" &&
        lp.maxProductsPerMixedPallet &&
        targetPallet &&
        !alreadyInPallet &&
        targetPallet.items.length >= lp.maxProductsPerMixedPallet
      ) {
        toast.error(`Limite de ${lp.maxProductsPerMixedPallet} produtos por pallet misto atingido.`);
        return;
      }

      addToPallet(orderItemId, palletTempId, freeQty);
    },
    [poolProducts, getFreeQty, pallets, loadingPoints, addToPallet]
  );

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setApiError(null);
    try {
      let updated: ConvertSuggestionToOrderResponse | null = null;

      for (const demand of order.loadingPointDemands) {
        const demandPallets = pallets
          .filter((p) => p.loadingPointId === demand.loadingPoint.id && p.items.length > 0)
          .map((p) => ({
            items: p.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
          }));

        updated = await patchPalletArrangement(order.orderId, demand.id, { pallets: demandPallets });
      }

      if (updated) {
        onSaved(updated);
      }
      onOpenChange(false);
      toast.success("Arranjo de pallets salvo com sucesso.");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Erro ao salvar arranjo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const visiblePallets = pallets.filter((p) => p.loadingPointId === activeLoadingPointId);
  const visiblePool = poolProducts.filter((p) => p.loadingPointId === activeLoadingPointId);
  const dragProduct = dragActiveId
    ? poolProducts.find((p) => p.orderItemId === dragActiveId) ?? null
    : null;
  const currentLoadingPoint = loadingPoints.find((l) => l.id === activeLoadingPointId);
  const hasMultipleLPs = loadingPoints.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90dvh] border-border bg-surface-1 p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers3 className="size-5 text-target" />
            Composição de Pallets
          </DialogTitle>
          <DialogDescription>
            Arraste produtos do painel direito para os pallets. A soma de cada produto deve
            igualar a quantidade total confirmada na order.
          </DialogDescription>
        </DialogHeader>

        {/* Loading point tabs (only when multiple) */}
        {hasMultipleLPs && (
          <div className="flex items-center gap-0 px-6 pt-3 shrink-0 border-b border-border overflow-x-auto">
            {loadingPoints.map((lp) => (
              <button
                key={lp.id}
                type="button"
                onClick={() => setActiveLoadingPointId(lp.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                  activeLoadingPointId === lp.id
                    ? "border-target text-target"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {lp.name}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-4 px-1.5",
                    activeLoadingPointId === lp.id
                      ? "border-target/50 bg-target/10 text-target"
                      : ""
                  )}
                >
                  {pallets.filter((p) => p.loadingPointId === lp.id).length}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Main content: pallets + pool */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left — Pallets */}
            <div className="w-[55%] flex flex-col min-h-0 border-r border-border">
              <div className="px-4 py-2.5 bg-surface-2 flex items-center justify-between shrink-0 border-b border-border/60">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Pallets ({visiblePallets.length})
                  {currentLoadingPoint && (
                    <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                      — {currentLoadingPoint.name}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs gap-1"
                  onClick={addNewPallet}
                >
                  <Plus className="size-3" />
                  Novo pallet
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visiblePallets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 text-center text-sm text-muted-foreground">
                    <Layers3 className="size-8 mb-3 opacity-30" />
                    <span>Nenhum pallet neste ponto de carregamento.</span>
                    <span className="text-xs mt-1">Clique em "Novo pallet" para começar.</span>
                  </div>
                )}
                {visiblePallets.map((pallet, idx) => (
                  <DroppablePallet
                    key={pallet.tempId}
                    pallet={pallet}
                    index={idx}
                    loadingPoint={currentLoadingPoint}
                    allocatedQtyMap={allocatedQtyMap}
                    poolProducts={poolProducts}
                    onRemoveItem={removeFromPallet}
                    onUpdateQty={updateItemQty}
                    onRemovePallet={removePallet}
                  />
                ))}
              </div>
            </div>

            {/* Right — Product pool */}
            <div className="w-[45%] flex flex-col min-h-0">
              <div className="px-4 py-2.5 bg-surface-2 shrink-0 border-b border-border/60">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Produtos disponíveis
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Arraste para um pallet · laranja = precisa de alocação
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {visiblePool.map((product) => (
                  <DraggablePoolCard
                    key={product.orderItemId}
                    product={product}
                    freeQty={getFreeQty(product.orderItemId, product.finalQuantity)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DragOverlay>
            {dragProduct && (
              <div className="rounded-md border border-target bg-surface-1 p-3 shadow-xl opacity-95 w-64 pointer-events-none">
                <div className="text-sm font-medium">
                  {dragProduct.productName || dragProduct.sku}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {dragProduct.sku}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1 min-w-0">
              {apiError && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}
              {validationErrors.map((err) => (
                <div key={err} className="flex items-center gap-2 text-xs text-attention">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
              {!apiError && validationErrors.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-ok">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  Arranjo válido — pronto para salvar
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || validationErrors.length > 0}
                className="gap-1.5"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Salvar Arranjo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
