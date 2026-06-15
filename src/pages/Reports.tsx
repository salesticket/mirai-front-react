import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Boxes, FileBarChart, Layers3, Loader2, Package2, PackageCheck, Pencil, Shuffle } from "lucide-react";
import { AppSidebar } from "@/components/inventory/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchOrderSummary, getLastOrderReport, saveLastOrderReport } from "@/lib/orders";
import { formatPalletCount, formatQuantity, getLoadingPointLabel } from "@/lib/pallets";
import type { ConvertSuggestionToOrderResponse } from "@/types/inventory";
import { EditOrderItemsModal } from "@/components/inventory/EditOrderItemsModal";

const PalletArrangementModal = lazy(() =>
  import("@/components/inventory/PalletArrangementModal").then((m) => ({
    default: m.PalletArrangementModal,
  }))
);

const toNumber = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? 0 : Number(value);

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const SummaryMetric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-md border border-border bg-surface-1 p-4">
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
  </div>
);

type LoadingPointDemand = ConvertSuggestionToOrderResponse["loadingPointDemands"][number];
type Pallet = NonNullable<LoadingPointDemand["pallets"]>[number];
type PalletCardData = {
  demand: LoadingPointDemand;
  pallet: Pallet;
};

const palletTypeLabel = (type: string) => {
  if (type === "FULL") return "Cheio";
  if (type === "PARTIAL") return "Parcial";
  if (type === "MIXED") return "Misto";
  return type;
};

const palletTypeStyle = (type: string) => {
  if (type === "FULL") return "border-ok/30 bg-ok/10 text-ok";
  if (type === "PARTIAL") return "border-attention/30 bg-attention/10 text-attention";
  if (type === "MIXED") return "border-target/30 bg-target/10 text-target";
  return "border-border bg-accent text-muted-foreground";
};

const Reports = () => {
  const [report, setReport] = useState(() => getLastOrderReport());
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<PalletCardData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [palletModalOpen, setPalletModalOpen] = useState(false);
  const order = report?.order;
  const canEdit = ["DRAFT", "UNDER_REVIEW"].includes((order?.status ?? "").trim().toUpperCase());

  const handleOrderSaved = (updated: ConvertSuggestionToOrderResponse) => {
    saveLastOrderReport(updated);
    setReport({ savedAt: new Date().toISOString(), order: updated });
  };

  const palletCards = useMemo(
    () =>
      order?.loadingPointDemands.flatMap((demand) =>
        (demand.pallets ?? []).map((pallet) => ({ demand, pallet })),
      ) ?? [],
    [order],
  );

  useEffect(() => {
    if (!order?.orderId) return;

    let mounted = true;
    setLoadingSummary(true);
    fetchOrderSummary(order.orderId)
      .then((summary) => {
        if (!mounted) return;
        saveLastOrderReport(summary);
        setReport({ savedAt: new Date().toISOString(), order: summary });
      })
      .catch(() => {
        if (!mounted) return;
      })
      .finally(() => {
        if (mounted) setLoadingSummary(false);
      });

    return () => {
      mounted = false;
    };
  }, [order?.orderId]);

  return (
    <div className="min-h-dvh w-full flex bg-background">
      <AppSidebar />

      <main className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <FileBarChart className="size-4" />
                <span className="font-mono uppercase tracking-widest">Relatórios</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Relatório da compra confirmada</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Detalhamento definitivo da Order gerada a partir da sugestão de compra.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Voltar para sugestões
              </Link>
            </Button>
          </div>

          {!order ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-accent">
                <FileBarChart className="size-6 text-target" />
              </div>
              <h2 className="text-base font-semibold">Nenhum pedido confirmado nesta sessão</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Gere e confirme uma Order pela sugestão de compra para visualizar o relatório operacional.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-surface-1 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Código da Order
                    </div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{order.code}</div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        Order ID: <span className="font-mono text-foreground">{order.orderId}</span>
                      </div>
                      <div>
                        Sugestão ID:{" "}
                        <span className="font-mono text-foreground">{order.purchaseSuggestionId}</span>
                      </div>
                      <div>Pedido salvo em {report ? formatDateTime(report.savedAt) : "agora"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-target/40 bg-target/10 text-target">
                      {order.status}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs border-target/30 text-target hover:bg-target/10 hover:border-target/50"
                        onClick={() => setEditModalOpen(true)}
                      >
                        <Pencil className="size-3" />
                        Editar pedido
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="sm:col-span-2 xl:col-span-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>Montagem definitiva retornada pela API</span>
                    {loadingSummary && (
                      <span className="inline-flex items-center gap-1 text-target">
                        <Loader2 className="size-3 animate-spin" />
                        Atualizando
                      </span>
                    )}
                  </div>
                </div>
                <SummaryMetric label="Produtos" value={formatQuantity(order.summary.totalProducts)} />
                <SummaryMetric label="Unidades" value={formatQuantity(order.summary.totalUnits)} />
                <SummaryMetric label="Pallets montados" value={formatQuantity(order.summary.physicalPallets)} />
                <SummaryMetric
                  label="Ocupação total"
                  value={formatPalletCount(order.summary.totalPalletOccupancy)}
                />
                <SummaryMetric label="Pallets cheios" value={formatQuantity(order.summary.fullPallets)} />
                <SummaryMetric label="Pallets parciais" value={formatQuantity(order.summary.partialPallets)} />
                <SummaryMetric label="Pallets mistos" value={formatQuantity(order.summary.mixedPallets)} />
                <SummaryMetric label="Valor estimado" value={formatCurrency(order.summary.estimatedValue)} />
              </section>

              <section className="rounded-lg border border-border bg-surface-1">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold">Pallets montados</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Composição física calculada pelo backend para cada ponto de carregamento.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-target/40 bg-target/10 text-target">
                      {formatQuantity(palletCards.length)} pallets
                    </Badge>
                    {canEdit && palletCards.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs"
                        onClick={() => setPalletModalOpen(true)}
                      >
                        <Shuffle className="size-3" />
                        Compor Pallets Manualmente
                      </Button>
                    )}
                  </div>
                </div>

                {palletCards.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">
                    A API ainda não retornou a lista física de pallets para esta Order.
                  </div>
                ) : (
                  <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {palletCards.map(({ demand, pallet }) => {
                      const typeStyle = palletTypeStyle(pallet.type);
                      const occupancy = toNumber(pallet.occupancy);
                      const firstItems = pallet.items.slice(0, 2);

                      return (
                        <button
                          key={pallet.id}
                          type="button"
                          onClick={() => setSelectedPallet({ demand, pallet })}
                          className="rounded-md border border-border bg-surface-2 p-4 text-left transition hover:border-target/50 hover:bg-accent/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${typeStyle}`}>
                                {pallet.type === "MIXED" ? (
                                  <Layers3 className="size-5" />
                                ) : (
                                  <PackageCheck className="size-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-mono text-sm font-semibold tabular-nums">
                                  Pallet #{String(pallet.sequenceNumber).padStart(2, "0")}
                                </div>
                                <div className="truncate text-[11px] text-muted-foreground">
                                  {demand.loadingPoint.name}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className={typeStyle}>
                              {palletTypeLabel(pallet.type)}
                            </Badge>
                          </div>

                          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-accent">
                            <div
                              className="h-full rounded-full bg-target"
                              style={{ width: `${Math.min(100, occupancy * 100)}%` }}
                            />
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {firstItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate text-muted-foreground">{item.productName ?? item.sku}</span>
                                <span className="shrink-0 font-mono tabular-nums text-foreground">
                                  {formatQuantity(toNumber(item.quantity))} un
                                </span>
                              </div>
                            ))}
                            {pallet.items.length > firstItems.length && (
                              <div className="text-[11px] text-muted-foreground">
                                +{pallet.items.length - firstItems.length} produtos
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-border bg-surface-1">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <h2 className="text-base font-semibold">Produtos confirmados</h2>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => setEditModalOpen(true)}
                    >
                      <Pencil className="size-3" />
                      Editar itens
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-medium">Produto</th>
                        <th className="px-4 py-3 text-left font-medium">Ponto</th>
                        <th className="px-4 py-3 text-right font-medium">Qtd. final</th>
                        <th className="px-4 py-3 text-right font-medium">Qtd. pallet</th>
                        <th className="px-4 py-3 text-right font-medium">Ocupação</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">Edição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-b border-border/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded bg-accent">
                                <Package2 className="size-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{item.productName ?? "Produto"}</div>
                                <div className="font-mono text-[11px] text-muted-foreground">{item.sku ?? "SKU"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {getLoadingPointLabel(item.loadingPoint)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {formatQuantity(toNumber(item.finalQuantity))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {formatQuantity(toNumber(item.quantityPerPallet))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {formatPalletCount(toNumber(item.totalPallets))}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {item.loadingPoint?.type ?? "N/A"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {item.manuallyEdited ? item.editReason ?? "Editado manualmente" : "Sem edição"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-surface-1">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-base font-semibold">Demandas por ponto de carregamento</h2>
                </div>
                <div className="grid gap-3 p-5 lg:grid-cols-2">
                  {order.loadingPointDemands.map((demand) => (
                    <div key={demand.id} className="rounded-md border border-border bg-surface-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{demand.loadingPoint.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{demand.loadingPoint.type}</div>
                        </div>
                        <Badge variant="outline">{formatQuantity(demand.palletCount)} pallets</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        {[
                          ["Ocupação", formatPalletCount(toNumber(demand.totalPallets))],
                          ["Pallets físicos", formatQuantity(demand.summary.physicalPallets)],
                          ["Cheios", formatQuantity(demand.summary.fullPallets)],
                          ["Parciais", formatQuantity(demand.summary.partialPallets)],
                          ["Mistos", formatQuantity(demand.summary.mixedPallets)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {label}
                            </div>
                            <div className="font-mono font-semibold tabular-nums">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {order && (
        <EditOrderItemsModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          orderId={order.orderId}
          orderCode={order.code}
          purchaseSuggestionId={order.purchaseSuggestionId}
          currentItems={order.items}
          onSaved={handleOrderSaved}
        />
      )}

      {order && (
        <Suspense fallback={null}>
          <PalletArrangementModal
            open={palletModalOpen}
            onOpenChange={setPalletModalOpen}
            order={order}
            onSaved={handleOrderSaved}
          />
        </Suspense>
      )}

      <Dialog open={Boolean(selectedPallet)} onOpenChange={(open) => !open && setSelectedPallet(null)}>
        <DialogContent className="max-w-2xl border-border bg-surface-1">
          {selectedPallet && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-3">
                  <div
                    className={`flex size-11 items-center justify-center rounded-md border ${palletTypeStyle(
                      selectedPallet.pallet.type,
                    )}`}
                  >
                    <Boxes className="size-5" />
                  </div>
                  <div>
                    <DialogTitle>
                      Pallet #{String(selectedPallet.pallet.sequenceNumber).padStart(2, "0")}{" "}
                      {palletTypeLabel(selectedPallet.pallet.type)}
                    </DialogTitle>
                    <DialogDescription>{selectedPallet.demand.loadingPoint.name}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-3 text-xs sm:grid-cols-3">
                <SummaryMetric
                  label="Produtos"
                  value={formatQuantity(selectedPallet.pallet.productCount)}
                />
                <SummaryMetric
                  label="Ocupação"
                  value={`${formatPalletCount(toNumber(selectedPallet.pallet.occupancy) * 100)}%`}
                />
                <SummaryMetric label="Status" value={selectedPallet.pallet.status} />
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-border">
                <div className="grid grid-cols-[minmax(0,1fr)_110px_90px] gap-3 border-b border-border bg-surface-2 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <div>Produto</div>
                  <div className="text-right">Quantidade</div>
                  <div className="text-right">Ocupação</div>
                </div>
                <div className="max-h-[45dvh] overflow-y-auto scrollbar-thin">
                  {selectedPallet.pallet.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_110px_90px] gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.productName ?? "Produto"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{item.sku ?? "SKU"}</div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        {formatQuantity(toNumber(item.quantity))} un
                      </div>
                      <div className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatPalletCount(toNumber(item.occupancyPercentage))}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
