import { apiUrl, readApiError } from "@/lib/api";
import type {
  ConvertSuggestionToOrderPayload,
  ConvertSuggestionToOrderResponse,
  PurchaseSuggestionItem,
} from "@/types/inventory";

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

export const normalizeOrderReport = (data: unknown): ConvertSuggestionToOrderResponse => {
  const raw = data as ConvertSuggestionToOrderResponse & {
    id?: string;
    order?: {
      id?: string;
      code?: string;
      status?: string;
      purchaseSuggestionId?: string;
      notes?: string | null;
    };
  };

  return {
    ...raw,
    orderId: raw.orderId ?? raw.id ?? raw.order?.id ?? "",
    code: raw.code ?? raw.order?.code ?? "",
    status: raw.status ?? raw.order?.status ?? "",
    purchaseSuggestionId:
      raw.purchaseSuggestionId ?? raw.order?.purchaseSuggestionId ?? raw.order?.notes?.match(/[0-9a-f-]{36}/i)?.[0] ?? "",
    summary: raw.summary,
    items: raw.items ?? [],
    loadingPointDemands: raw.loadingPointDemands ?? [],
  };
};

export const fetchOrderSummary = async (orderId: string) => {
  const response = await fetch(apiUrl(`/replenishment-orders/${orderId}/summary`));

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não foi possível carregar o resumo de pallets da Order."));
  }

  return normalizeOrderReport(await response.json());
};

export const fetchPurchaseSuggestionItems = async (suggestionId: string): Promise<PurchaseSuggestionItem[]> => {
  const response = await fetch(apiUrl(`/purchase-suggestions/${suggestionId}/items`));
  if (!response.ok) {
    throw new Error(await readApiError(response, "Não foi possível carregar os itens da sugestão."));
  }
  return response.json();
};

export const patchOrderItems = async (
  orderId: string,
  payload: { items: unknown[] },
): Promise<ConvertSuggestionToOrderResponse> => {
  const response = await fetch(apiUrl(`/replenishment-orders/${orderId}/items`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const fallback =
      response.status === 400
        ? "Dados inválidos. Verifique as quantidades e motivos de edição."
        : "Não foi possível atualizar os itens do pedido.";
    throw new Error(await readApiError(response, fallback));
  }
  return normalizeOrderReport(await response.json());
};

export const patchPalletArrangement = async (
  orderId: string,
  demandId: string,
  payload: { pallets: { items: { orderItemId: string; quantity: number }[] }[] },
): Promise<ConvertSuggestionToOrderResponse> => {
  const response = await fetch(
    apiUrl(`/replenishment-orders/${orderId}/demands/${demandId}/pallet-arrangement`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const fallback =
      response.status === 400
        ? "Arranjo inválido. Verifique as quantidades e regras de ponto de carregamento."
        : "Não foi possível salvar o arranjo de pallets.";
    throw new Error(await readApiError(response, fallback));
  }
  return normalizeOrderReport(await response.json());
};

export const saveLastOrderReport = (order: ConvertSuggestionToOrderResponse) => {
  localStorage.setItem(
    LAST_ORDER_REPORT_KEY,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      order: normalizeOrderReport(order),
    }),
  );
};

export const getLastOrderReport = () => {
  const raw = localStorage.getItem(LAST_ORDER_REPORT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { savedAt: string; order: unknown };
    return { ...parsed, order: normalizeOrderReport(parsed.order) };
  } catch {
    return null;
  }
};
