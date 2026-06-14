Relatório Técnico — Edição de Itens da Order de Reabastecimento
Endpoint

PATCH /replenishment-orders/:id/items
Regras de negócio
A order só pode ser editada nos status DRAFT ou UNDER_REVIEW
Não são permitidos produtos duplicados no payload
Quando a quantidade de um item existente muda, editReason é obrigatório
Toda vez que o endpoint é chamado, os pallets e demands são destruídos e regenerados do zero com base nos novos itens
O endpoint retorna o mesmo shape do GET /replenishment-orders/:id/summary
Body da requisição

{
  "items": Array<ExistingItem | NewItem>   // mínimo 1 item
}
ExistingItem — atualizar quantidade ou manter item já na order

{
  "orderItemId": "uuid",        // id do item na order (vem do summary)
  "quantity": 10,               // nova quantidade (inteiro positivo)
  "editReason": "string"        // obrigatório se quantity mudou
}
NewItem — adicionar item que estava na sugestão mas não foi selecionado

{
  "purchaseSuggestionItemId": "uuid",  // id do item na sugestão de compra
  "productId": "uuid",                 // productId correspondente
  "quantity": 5,                       // inteiro positivo
  "editReason": "string"               // obrigatório se difere da qty sugerida
}
Remoção: qualquer orderItemId que NÃO aparecer no array items é automaticamente removido da order.

Exemplo — remover 1 item, ajustar quantidade de outro, adicionar 1 novo

PATCH /replenishment-orders/735929d2-0d40-498b-b4a5-bf1ccd5a1251/items

{
  "items": [
    {
      "orderItemId": "d449e842-aed0-4897-a1b2-72ab80733364",
      "quantity": 9
    },
    {
      "orderItemId": "fb33ec42-3bcd-4813-b470-47f874f63659",
      "quantity": 50,
      "editReason": "Ajuste por demanda prevista"
    },
    {
      "purchaseSuggestionItemId": "953e23b0-b8ec-45d7-a825-5bdc9cc9c3bb",
      "productId": "9ae5c349-299f-48fb-96c7-0f64097d20df",
      "quantity": 2
    }
  ]
}
Neste exemplo os itens 4989a022, af70dd29 e ee3a3f33 (não incluídos) são removidos.

Response (200 OK)
Mesmo shape do GET /replenishment-orders/:id/summary:


{
  order: {
    id, code, status, origin,
    branchId, branchName,
    inventoryReferenceDate,
    notes, createdAt, updatedAt
  },
  summary: {
    totalProducts: number,
    totalUnits: number,
    totalPalletOccupancy: number,
    fullPallets: number,
    partialPallets: number,
    mixedPallets: number,
    physicalPallets: number
  },
  items: Array<{
    id, productId, loadingPointId, sku, productName,
    finalQuantity, quantityPerPallet, totalPallets,
    manuallyEdited, editReason,
    classification, priority
  }>,
  loadingPointDemands: Array<{
    id, status, loadingPoint, totalPallets,
    summary: { totalPalletOccupancy, fullPallets, partialPallets, mixedPallets, physicalPallets },
    palletCount,
    pallets: Array<{
      id, type, sequenceNumber, productCount, occupancy,
      items: Array<{ id, productId, orderItemId, sku, productName, quantity, occupancyPercentage }>
    }>
  }>
}
Erros possíveis
Status	Mensagem	Causa
400	Order can only be edited in DRAFT or UNDER_REVIEW status	Order já aprovada/enviada
400	Duplicate products are not allowed	Mesmo productId duas vezes no array
400	Order item {id} does not belong to this order	orderItemId inválido
400	Purchase suggestion item {id} not found	purchaseSuggestionItemId inválido
400	editReason is required when changing quantity for item {id}	Mudou qty sem informar razão
400	Product {id} not found or inactive	Produto do novo item inativo/deletado
404	Replenishment order not found	orderId inválido
Fonte de dados para o frontend montar o payload
Items existentes (orderItemId): vêm do campo items[].id do GET /replenishment-orders/:id/summary
Items disponíveis para adicionar: vêm de GET /purchase-suggestions/:purchaseSuggestionId/items — os que não estão na order atual (comparar por productId)
O purchaseSuggestionId da order está disponível no response do POST .../convert-to-order que gerou a order