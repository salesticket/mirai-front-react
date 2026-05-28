import type { ComputedRow, LoadingPoint } from "@/types/inventory";

export const formatQuantity = (value: number, maximumFractionDigits = 3) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);

export const formatPalletCount = (value: number) => formatQuantity(value, 3);

export const calculatePalletCount = (quantity: number, unitsPerPallet: number) => {
  if (unitsPerPallet <= 0) return 0;
  return quantity / unitsPerPallet;
};

export const getLoadingPointLabel = (loadingPoint?: LoadingPoint | null) => {
  if (!loadingPoint) return "Ponto não informado";
  return `${loadingPoint.name} (${loadingPoint.type})`;
};

export const getPalletTotalsByLoadingPoint = (rows: ComputedRow[]) => {
  return rows.reduce(
    (totals, row) => {
      const pallets = calculatePalletCount(row.suggestion.editedSuggestion, row.product.unitsPerPallet);
      totals.total += pallets;

      if (row.product.loadingPoint?.type === "SIMPLE") {
        totals.simple += pallets;
      } else if (row.product.loadingPoint?.type === "MIXED") {
        totals.mixed += pallets;
      } else {
        totals.unclassified += pallets;
      }

      return totals;
    },
    { total: 0, simple: 0, mixed: 0, unclassified: 0 },
  );
};
