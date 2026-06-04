import { Link } from "react-router-dom";
import { ArrowLeft, FileBarChart, Package2 } from "lucide-react";
import { AppSidebar } from "@/components/inventory/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLastOrderReport } from "@/lib/orders";
import { formatPalletCount, formatQuantity, getLoadingPointLabel } from "@/lib/pallets";

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

const Reports = () => {
  const report = getLastOrderReport();
  const order = report?.order;

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
                  <Badge variant="outline" className="border-target/40 bg-target/10 text-target">
                    {order.status}
                  </Badge>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="sm:col-span-2 xl:col-span-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Montagem definitiva retornada pela API
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
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-base font-semibold">Produtos confirmados</h2>
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
    </div>
  );
};

export default Reports;
