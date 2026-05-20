export type Priority = "critical" | "attention" | "target" | "ok";
export type Confidence = "high" | "medium" | "low";

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
}

export interface ProductSuggestion {
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
