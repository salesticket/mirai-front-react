import { apiUrl, readApiError } from "@/lib/api";
import type { ConvertSuggestionToOrderPayload, ConvertSuggestionToOrderResponse } from "@/types/inventory";

const LAST_ORDER_REPORT_KEY = "restock-mirai:last-order-report";

export const approvePurchaseSuggestion = async (suggestionId: string) => {
  const response = await fetch(apiUrl(`/purchase-suggestions/${suggestionId}/approve`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não foi possível aprovar a sugestão antes de gerar o pedido."));
  }
};

export const convertSuggestionToOrder = async (
  suggestionId: string,
  payload: ConvertSuggestionToOrderPayload,
) => {
  const response = await fetch(apiUrl(`/purchase-suggestions/${suggestionId}/convert-to-order`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const fallback =
      response.status === 404
        ? "Sugestão não encontrada ou indisponível."
        : "Não foi possível gerar o pedido. Tente novamente.";
    throw new Error(await readApiError(response, fallback));
  }

  return response.json() as Promise<ConvertSuggestionToOrderResponse>;
};

export const saveLastOrderReport = (order: ConvertSuggestionToOrderResponse) => {
  localStorage.setItem(
    LAST_ORDER_REPORT_KEY,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      order,
    }),
  );
};

export const getLastOrderReport = () => {
  const raw = localStorage.getItem(LAST_ORDER_REPORT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { savedAt: string; order: ConvertSuggestionToOrderResponse };
  } catch {
    return null;
  }
};
