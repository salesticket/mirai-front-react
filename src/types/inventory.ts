export type Priority = "critical" | "attention" | "target" | "ok";
export type Confidence = "high" | "medium" | "low";
export type LoadingPointType = "SIMPLE" | "MIXED" | string;

export interface LoadingPoint {
  id: number;
  name: string;
  type: LoadingPointType;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string;
  category: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  average30d: number;
  average15d: number;
  average1d: number;
  safetyStock: number;
  desiredCoverageDays: number;
  categoryTarget: number; // target stock level for the category
  unitsPerPallet: number;
  unitPrice: number;
  availableSupplierStock: number;
  loadingPoint?: LoadingPoint | null;
}

export interface ProductSuggestion {
  purchaseSuggestionItemId?: string;
  productId: string;
  averageTurnover: number;
  rawSuggestion: number;
  finalSuggestion: number;
  editedSuggestion: number;
  stockDays: number;
  priority: Priority;
  confidence: Confidence;
  reason: string;
  palletCount: number;
  multipleApplied: number;
  supplierShort: boolean;
}

export interface ComputedRow {
  product: Product;
  suggestion: ProductSuggestion;
}

export interface OrderLoadingPoint {
  id: number;
  name: string;
  type: LoadingPointType;
  maxProductsPerMixedPallet?: number | null;
}

export interface ConvertSuggestionToOrderPayload {
  createdById?: string;
  items: Array<{
    purchaseSuggestionItemId?: string;
    productId: string;
    quantity: number;
    editReason?: string;
  }>;
}

export interface ConvertSuggestionToOrderResponse {
  orderId: string;
  code: string;
  status: string;
  purchaseSuggestionId: string;
  summary: {
    totalProducts: number;
    totalUnits: number;
    totalPalletOccupancy: number;
    fullPallets: number;
    partialPallets: number;
    mixedPallets: number;
    physicalPallets: number;
    estimatedValue?: string | number | null;
  };
  items: Array<{
    id: string;
    productId: string;
    sku: string | null;
    productName: string | null;
    loadingPoint: OrderLoadingPoint | null;
    finalQuantity: string | number;
    quantityPerPallet: string | number;
    totalPallets: string | number;
    manuallyEdited: boolean;
    editReason: string | null;
  }>;
  loadingPointDemands: Array<{
    id: string;
    loadingPoint: OrderLoadingPoint;
    totalPallets: string | number;
    summary: {
      totalPalletOccupancy: number;
      fullPallets: number;
      partialPallets: number;
      mixedPallets: number;
      physicalPallets: number;
    };
    palletCount: number;
  }>;
}
