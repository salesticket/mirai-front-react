import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/inventory/AppSidebar";
import { PageHeader } from "@/components/inventory/PageHeader";
import { MetricsCards } from "@/components/inventory/MetricsCards";
import { FiltersBar, type FiltersState } from "@/components/inventory/FiltersBar";
import { GenerateSuggestionButton } from "@/components/inventory/GenerateSuggestionButton";
import { ProductSuggestionTable } from "@/components/inventory/ProductSuggestionTable";
import { SelectedOrderSummary } from "@/components/inventory/SelectedOrderSummary";
import { OrderReviewDrawer } from "@/components/inventory/OrderReviewDrawer";
import { ProductDetailsDrawer } from "@/components/inventory/ProductDetailsDrawer";
import { AiAssistantDrawer } from "@/components/inventory/AiAssistantDrawer";
import type { ComputedRow, Confidence, Priority, Product, ProductSuggestion } from "@/types/inventory";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

const apiUrl = (path: string) => {
  if (!API_BASE_URL) {
    throw new Error("Configure VITE_API_BASE_URL no arquivo .env.");
  }

  return `${API_BASE_URL}${path}`;
};

type BranchApi = {
  id: number;
  name: string;
  city?: string;
  state?: string;
  status?: string;
};

type PurchaseSuggestionItemApi = {
  id: string;
  purchaseSuggestionId: string;
  productId: string;
  categoryId: number | null;
  categoryName?: string | null;
  category_name?: string | null;
  sku: string;
  productName: string;
  inventoryQuantity: string | number;
  averageDailyConsumption: string | number;
  availableStockDays: string | number | null;
  safetyStockDays: number;
  quantityPerPallet: string | number;
  suggestedQuantity: string | number;
  finalQuantity: string | number;
  totalPallets: string | number;
  priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA" | "SEM_COMPRA" | "REVISAR";
  recommendedAction: "COMPRAR" | "NAO_COMPRAR" | "REVISAR";
  justification: string | null;
  confidence: string | number | null;
  backendValidated: boolean;
  validationReason: string | null;
  manuallyEdited: boolean;
  editReason: string | null;
};

type PurchaseSuggestionGenerateResponse = {
  id: string;
  filial_id: number;
  total_produtos_analisados: number;
  total_itens_sugeridos: number;
  total_pallets_sugeridos: string | number | null;
  erro: string | null;
  itens?: PurchaseSuggestionItemApi[];
  items?: PurchaseSuggestionItemApi[];
};

const toNumber = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? 0 : Number(value);

const toNullableNumber = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? null : Number(value);

const mapPriority = (priority: PurchaseSuggestionItemApi["priority"]): Priority => {
  if (priority === "CRITICA" || priority === "ALTA") return "critical";
  if (priority === "MEDIA" || priority === "REVISAR") return "attention";
  if (priority === "BAIXA") return "target";
  return "ok";
};

const mapConfidence = (confidence: PurchaseSuggestionItemApi["confidence"]): Confidence => {
  const value = toNullableNumber(confidence);
  if (value === null) return "medium";
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
};

const branchLabel = (branch?: BranchApi) => {
  if (!branch) return "Filial";
  const location = [branch.city, branch.state].filter(Boolean).join(" / ");
  return location ? `${branch.name} (${location})` : branch.name;
};

const mapApiItemToRow = (
  item: PurchaseSuggestionItemApi,
  branch: BranchApi | undefined,
): ComputedRow => {
  const currentStock = toNumber(item.inventoryQuantity);
  const averageDailyConsumption = toNumber(item.averageDailyConsumption);
  const stockDays = toNullableNumber(item.availableStockDays);
  const safetyStock = toNumber(item.safetyStockDays);
  const unitsPerPallet = Math.max(1, toNumber(item.quantityPerPallet));
  const rawSuggestion = toNumber(item.suggestedQuantity);
  const finalSuggestion = toNumber(item.finalQuantity);
  const category = (item.categoryName ?? item.category_name ?? "").trim() || "Não informado";

  const product: Product = {
    id: item.productId,
    sku: item.sku,
    name: item.productName,
    category,
    branchId: String(branch?.id ?? ""),
    branchName: branchLabel(branch),
    currentStock,
    average30d: averageDailyConsumption,
    average15d: averageDailyConsumption,
    average1d: averageDailyConsumption,
    safetyStock,
    desiredCoverageDays: safetyStock,
    categoryTarget: Math.max(currentStock, safetyStock),
    unitsPerPallet,
    unitPrice: 0,
    availableSupplierStock: Number.MAX_SAFE_INTEGER,
  };

  const suggestion: ProductSuggestion = {
    productId: item.productId,
    averageTurnover: averageDailyConsumption,
    rawSuggestion,
    finalSuggestion,
    editedSuggestion: finalSuggestion,
    stockDays: stockDays ?? Infinity,
    priority: mapPriority(item.priority),
    confidence: mapConfidence(item.confidence),
    reason: [item.justification, item.validationReason, item.editReason].filter(Boolean).join(" ") || "Sem justificativa retornada pela API.",
    palletCount: toNumber(item.totalPallets),
    multipleApplied: unitsPerPallet,
    supplierShort: false,
  };

  return { product, suggestion };
};

const Index = () => {
  const [period, setPeriod] = useState("30d");
  const [filters, setFilters] = useState<FiltersState>({
    branchId: "1",
    category: "all",
    priority: "all",
    query: "",
  });
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchById, setBranchById] = useState<Record<string, BranchApi>>({});
  const [rows, setRows] = useState<ComputedRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderOpen, setOrderOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<ComputedRow | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!API_BASE_URL) {
      toast.error("URL da API não configurada", {
        description: "Configure VITE_API_BASE_URL no arquivo .env.",
      });
      return;
    }

    fetch(apiUrl("/branches"))
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao listar filiais");
        return response.json() as Promise<BranchApi[]>;
      })
      .then((data) => {
        if (!mounted) return;
        const activeBranches = data.filter((branch) => branch.status !== "INACTIVE");
        setBranches(activeBranches.map((branch) => ({ id: String(branch.id), name: branchLabel(branch) })));
        setBranchById(Object.fromEntries(activeBranches.map((branch) => [String(branch.id), branch])));
        setFilters((current) => {
          if (current.branchId !== "1" || activeBranches.some((branch) => String(branch.id) === "1")) return current;
          return { ...current, branchId: String(activeBranches[0]?.id ?? 1) };
        });
      })
      .catch((error) => {
        toast.error("Não foi possível carregar as filiais", {
          description: error instanceof Error ? error.message : undefined,
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const generate = async () => {
    const selectedBranchId = filters.branchId === "all" ? branches[0]?.id ?? "1" : filters.branchId;

    setGenerating(true);
    try {
      const response = await fetch(apiUrl("/purchase-suggestions/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filial_id: Number(selectedBranchId) }),
      });

      if (!response.ok) {
        let message = "Não foi possível gerar a sugestão para esta filial.";
        try {
          const body = await response.json();
          message = body?.message ?? body?.erro ?? body?.error ?? message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as PurchaseSuggestionGenerateResponse;
      const apiItems = data.itens ?? data.items ?? [];
      const branch = branchById[String(data.filial_id)] ?? branchById[selectedBranchId];
      const nextRows = apiItems.map((item) => mapApiItemToRow(item, branch));

      setRows(nextRows);
      setSelected(new Set());
      setGenerated(true);

      if (data.erro) {
        toast.warning("Sugestão gerada com alertas", { description: data.erro });
      } else {
        toast.success("Sugestão de compra gerada", {
          description: `${data.total_produtos_analisados ?? nextRows.length} produtos analisados pela API.`,
        });
      }
    } catch (error) {
      toast.error("Não foi possível gerar a sugestão para esta filial.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.product.category))).filter(
      (category) => category && category !== "Não informado",
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return rows.filter(({ product, suggestion }) => {
      if (filters.branchId !== "all" && product.branchId !== filters.branchId) return false;
      if (filters.category !== "all" && product.category !== filters.category) return false;
      if (filters.priority !== "all" && suggestion.priority !== filters.priority) return false;
      if (q && !`${product.name} ${product.sku}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filters]);

  const metrics = useMemo(() => {
    let critical = 0,
      attention = 0,
      target = 0,
      ok = 0,
      totalUnits = 0,
      totalPallets = 0,
      estimatedValue = 0;
    let coveredTargets = 0;

    rows.forEach(({ product, suggestion }) => {
      switch (suggestion.priority) {
        case "critical":
          critical++;
          break;
        case "attention":
          attention++;
          break;
        case "target":
          target++;
          break;
        case "ok":
          ok++;
          break;
      }
      totalUnits += suggestion.editedSuggestion;
      totalPallets += suggestion.palletCount;
      estimatedValue += suggestion.editedSuggestion * product.unitPrice;
      coveredTargets += Math.min(1, product.currentStock / Math.max(1, product.categoryTarget));
    });

    const fillRate = rows.length > 0 ? (coveredTargets / rows.length) * 100 : 0;

    return { critical, attention, target, ok, totalUnits, totalPallets, estimatedValue, fillRate };
  }, [rows]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const allIds = filteredRows.map((r) => r.product.id);
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const changeQty = (id: string, qty: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.product.id !== id) return row;
        return {
          ...row,
          suggestion: {
            ...row.suggestion,
            editedSuggestion: qty,
            palletCount: qty / Math.max(1, row.product.unitsPerPallet),
          },
        };
      }),
    );
  };

  const selectedRows = filteredRows.filter((r) => selected.has(r.product.id));
  const selectedTotals = selectedRows.reduce(
    (acc, r) => {
      acc.units += r.suggestion.editedSuggestion;
      acc.value += r.suggestion.editedSuggestion * r.product.unitPrice;
      acc.pallets += r.suggestion.editedSuggestion / Math.max(1, r.product.unitsPerPallet);
      return acc;
    },
    { units: 0, value: 0, pallets: 0 },
  );

  const openDetails = (row: ComputedRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-dvh w-full flex bg-background">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1600px] w-full mx-auto pb-32">
          <PageHeader period={period} onPeriodChange={setPeriod} />

          <div className="mt-6 space-y-6">
            <MetricsCards
              criticalCount={metrics.critical}
              attentionCount={metrics.attention}
              targetCount={metrics.target}
              okCount={metrics.ok}
              totalUnits={metrics.totalUnits}
              totalPallets={metrics.totalPallets}
              estimatedValue={metrics.estimatedValue}
              fillRate={metrics.fillRate}
            />

            <GenerateSuggestionButton
              generated={generated}
              loading={generating}
              onGenerate={generate}
              onRecalculate={generate}
              totalSuggested={metrics.totalUnits}
              totalProducts={rows.length}
            />

            <FiltersBar
              branches={branches}
              categories={categories}
              value={filters}
              onChange={setFilters}
            />

            <ProductSuggestionTable
              rows={filteredRows}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onChangeQty={changeQty}
              onOpenDetails={openDetails}
              generated={generated}
            />
          </div>
        </div>
      </main>

      <SelectedOrderSummary
        count={selectedRows.length}
        totalUnits={selectedTotals.units}
        totalPallets={selectedTotals.pallets}
        estimatedValue={selectedTotals.value}
        onClear={() => setSelected(new Set())}
        onGenerate={() => setOrderOpen(true)}
      />

      <OrderReviewDrawer open={orderOpen} onOpenChange={setOrderOpen} rows={selectedRows} />
      <ProductDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        row={detailsRow}
        onAskAi={() => setAiOpen(true)}
      />
      <AiAssistantDrawer open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
};

export default Index;
