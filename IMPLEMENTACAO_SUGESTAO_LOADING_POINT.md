# Implementacao: sugestao por filial, pallets e ponto de carga

## O que foi implementado no frontend

1. O modal de geracao de sugestao passou a exigir uma filial.
2. A filial selecionada no modal e enviada dinamicamente no body:

```json
{
  "filial_id": 2
}
```

3. Valores numericos retornados pela API como string decimal, por exemplo `"826.000"` ou `"1.000"`, sao convertidos para `number` antes de entrar no estado da tela.
4. A exibicao usa formatacao sem zeros finais. Exemplos:
   - `"826.000"` vira `826`
   - `"1.000"` vira `1`
   - `1.5` continua `1,5`
5. A contagem de pallets no frontend agora e recalculada por:

```ts
quantidade_final / quantidade_por_pallet
```

6. O frontend passou a aceitar `loadingPoint` ou `loading_point` em cada item da resposta da sugestao.
7. A barra do carrinho e o resumo do pedido passaram a separar pallets por:
   - `SIMPLE`: pallet cheio
   - `MIXED`: pallet misto
   - sem ponto de carga: itens sem classificacao retornada pela API

## Contrato recomendado para a API

O ideal e que cada item retornado por `POST /purchase-suggestions/generate` venha com o ponto de carga do produto no momento da geracao.

Exemplo:

```json
{
  "id": "50b22a23-a2cc-4c5b-87f8-7fb0498a2574",
  "productId": "257fedb4-b197-4575-9247-704fa99224a4",
  "sku": "56335",
  "productName": "COCA COLA SA MINI LT 6X220ML 06X220ML",
  "quantityPerPallet": "826.000",
  "finalQuantity": "826.000",
  "totalPallets": "1.000",
  "loadingPoint": {
    "id": 1,
    "name": "BFFF - Mixed Pallet Factory",
    "type": "MIXED"
  }
}
```

Tambem e aceito pelo frontend:

```json
{
  "loading_point": {
    "id": 1,
    "name": "BFFF - Mixed Pallet Factory",
    "type": "MIXED"
  }
}
```

## Por que o `loadingPoint` deve vir por item

O ponto de carga e uma caracteristica do produto/estoque usado na sugestao. Como o usuario pode selecionar produtos de pontos diferentes para fechar o pedido, o frontend precisa dessa informacao em cada item para calcular corretamente:

- total de pallets;
- total de pallets cheios (`SIMPLE`);
- total de pallets mistos (`MIXED`);
- itens sem ponto de carga informado.

Sem esse objeto por item, o frontend teria que fazer uma nova consulta por produto ou filial antes de montar o resumo, o que aumenta latencia e risco de divergencia entre os dados usados na sugestao e os dados exibidos no fechamento.

## Arquivos alterados

- `src/pages/Index.tsx`
- `src/types/inventory.ts`
- `src/lib/pallets.ts`
- `src/components/inventory/GenerateSuggestionButton.tsx`
- `src/components/inventory/SelectedOrderSummary.tsx`
- `src/components/inventory/OrderReviewDrawer.tsx`
- `src/components/inventory/ProductDetailsDrawer.tsx`
- `src/components/inventory/ProductSuggestionTable.tsx`
- `src/components/inventory/MetricsCards.tsx`
