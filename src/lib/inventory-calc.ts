import type { Confidence, Priority, Product, ProductSuggestion } from "@/types/inventory";

/** Weighted average turnover (units / day). 1d gets the most recent weight. */
export function calculateAverageTurnover(p: Product): number {
  const w30 = p.average30d * 0.4;
  const w15 = p.average15d * 0.35;
  const w1 = p.average1d * 0.25;
  return Math.max(0, w30 + w15 + w1);
}

export function calculateStockDays(p: Product, avg: number): number {
  if (avg <= 0) return Infinity;
  return p.currentStock / avg;
}

export function calculateRawSuggestion(p: Product, avg: number): number {
  const raw = avg * p.desiredCoverageDays + p.safetyStock - p.currentStock;
  return Math.max(0, Math.round(raw));
}

export function normalizeByLogisticMultiple(qty: number, multiple: number): number {
  if (qty <= 0 || multiple <= 0) return 0;
  return Math.ceil(qty / multiple) * multiple;
}

export function classifyPriority(p: Product, stockDays: number): Priority {
  if (p.currentStock < p.safetyStock || stockDays < 3) return "critical";
  if (stockDays < 7) return "attention";
  if (p.currentStock < p.categoryTarget) return "target";
  return "ok";
}

export function calculateConfidence(p: Product): Confidence {
  // Stable turnover across windows -> higher confidence
  const values = [p.average30d, p.average15d, p.average1d * 30].filter((v) => v > 0);
  if (values.length < 2) return "low";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const ratio = min / max;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

export function calculateEstimatedPallets(qty: number, unitsPerPallet: number): number {
  if (unitsPerPallet <= 0) return 0;
  return qty / unitsPerPallet;
}

export function calculateEstimatedOrderValue(qty: number, unitPrice: number): number {
  return qty * unitPrice;
}

export function generateSuggestionReason(
  p: Product,
  avg: number,
  raw: number,
  final: number,
  priority: Priority,
  stockDays: number,
): string {
  const priorityText: Record<Priority, string> = {
    critical: "Estoque atual abaixo do ponto de segurança — risco iminente de ruptura.",
    attention: "Cobertura próxima ao limite — recomenda-se reposição preventiva.",
    target: "Item abaixo da meta de categoria — sugestão para manter abastecimento ideal.",
    ok: "Estoque saudável — sem necessidade imediata de compra.",
  };

  const lines = [
    priorityText[priority],
    `Giro médio ponderado: ${avg.toFixed(1)} un/dia (cobre ${isFinite(stockDays) ? stockDays.toFixed(1) : "∞"} dias).`,
    `Cálculo: ${avg.toFixed(1)} × ${p.desiredCoverageDays}d + segurança ${p.safetyStock} − atual ${p.currentStock} = ${raw} un.`,
  ];
  if (final !== raw) {
    lines.push(`Ajuste logístico: arredondado para ${final} un (múltiplo de ${p.unitsPerPallet}/pallet).`);
  }
  return lines.join(" ");
}

export function computeSuggestion(p: Product): ProductSuggestion {
  const avg = calculateAverageTurnover(p);
  const stockDays = calculateStockDays(p, avg);
  const raw = calculateRawSuggestion(p, avg);
  const final = normalizeByLogisticMultiple(raw, p.unitsPerPallet);
  const priority = classifyPriority(p, stockDays);
  const confidence = calculateConfidence(p);
  const reason = generateSuggestionReason(p, avg, raw, final, priority, stockDays);

  return {
    productId: p.id,
    averageTurnover: avg,
    rawSuggestion: raw,
    finalSuggestion: final,
    editedSuggestion: final,
    stockDays,
    priority,
    confidence,
    reason,
    palletCount: calculateEstimatedPallets(final, p.unitsPerPallet),
    multipleApplied: p.unitsPerPallet,
    supplierShort: final > p.availableSupplierStock,
  };
}

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 0,
  attention: 1,
  target: 2,
  ok: 3,
};
