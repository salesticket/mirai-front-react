# Feature: Edição Manual de Composição de Pallets

## Contexto

O backend gera pallets automaticamente ao converter uma sugestão de compra em pedido de reposição. Esta feature permite ao usuário **rearranjar manualmente** quais produtos compõem cada pallet, respeitando as regras de ponto de carregamento validadas pelo backend.

O usuário vê os pallets existentes de um pedido, clica para editar um pallet e pode mover produtos entre pallets ou ajustar quantidades. Ao confirmar, o frontend envia o **arranjo completo** de todos os pallets do pedido para o backend.

---

## Endpoint do Backend

### `PATCH /replenishment-orders/:id/pallet-arrangement`

Substitui completamente o arranjo de pallets de um pedido de reposição.

**Regras de negócio (validadas pelo backend):**
- O pedido deve estar em status `DRAFT` ou `UNDER_REVIEW`
- Todos os `orderItemId` enviados devem pertencer ao pedido
- A soma das quantidades de cada `orderItemId` em todos os pallets deve ser igual à `finalQuantity` daquele item no pedido — nenhum produto pode ficar sem alocação, nenhum pode ter quantidade a mais
- Todos os itens dentro de um mesmo pallet devem pertencer ao **mesmo ponto de carregamento**
- Para pontos de carregamento do tipo `MIXED`: cada pallet pode ter no máximo `maxProductsPerMixedPallet` produtos distintos (geralmente 3)

**Cabeçalhos:**
```
PATCH /replenishment-orders/{orderId}/pallet-arrangement
Content-Type: application/json
```

**Request Body:**
```json
{
  "pallets": [
    {
      "items": [
        { "orderItemId": "fb33ec42-3bcd-4813-b470-47f874f63659", "quantity": 26 },
        { "orderItemId": "ee3a3f33-df04-4b81-94c3-53422db9dd4c", "quantity": 1 },
        { "orderItemId": "d449e842-aed0-4897-a1b2-72ab80733364", "quantity": 9 }
      ]
    },
    {
      "items": [
        { "orderItemId": "af70dd29-5712-40cb-af3f-52ff2ab7f18f", "quantity": 1 },
        { "orderItemId": "4989a022-751e-4d02-8219-bdcc43b02144", "quantity": 1 }
      ]
    }
  ]
}
```

> **Importante:** o array `pallets` representa a nova composição **total** do pedido. O backend descarta todos os pallets anteriores e recria com base no que foi enviado.

**Response (200 OK):** Retorna o mesmo shape de `GET /replenishment-orders/:id/summary` com o arranjo atualizado. Use esse retorno para atualizar o estado da tela sem precisar de uma segunda chamada.

**Erros possíveis:**
| Status | Quando |
|--------|--------|
| 400 | `orderItemId` não pertence ao pedido |
| 400 | Soma das quantidades de um item não bate com `finalQuantity` |
| 400 | Itens de pontos de carregamento diferentes no mesmo pallet |
| 400 | Pallet MIXED com mais produtos que `maxProductsPerMixedPallet` |
| 400 | Pedido não está em `DRAFT` ou `UNDER_REVIEW` |
| 404 | Pedido não encontrado |

---

## Dados Disponíveis (via `GET /replenishment-orders/:id/summary`)

O frontend já tem acesso a tudo que precisa via o endpoint de summary. Mapeamento das propriedades relevantes:

```typescript
// Cada item do pedido
order.items[n] = {
  id: string              // orderItemId — usar no body do PATCH
  productId: string
  sku: string
  productName: string
  loadingPointId: number  // agrupar por este campo para montar pools por ponto
  loadingPoint: {
    id: number
    name: string
    type: 'SIMPLE' | 'MIXED'
    maxProductsPerMixedPallet: number | null
  }
  finalQuantity: string   // quantidade total que DEVE ser alocada nos pallets
  quantityPerPallet: string
  totalPallets: string
}

// Cada pallet existente (dentro de loadingPointDemands[n].pallets[n])
pallet = {
  id: string
  type: 'FULL' | 'PARTIAL' | 'MIXED'
  sequenceNumber: number
  productCount: number
  occupancy: number       // fração 0-1, ex: 0.055 = 5.5%
  status: string
  items: [{
    id: string
    orderItemId: string   // usar este para identificar o item no PATCH
    productId: string
    sku: string
    productName: string
    quantity: string
    occupancyPercentage: string  // ex: "4.4" (percentual, não fração)
  }]
}
```

---

## Estado Local no Frontend

O frontend deve manter um estado em memória que representa o arranjo em edição **antes** de salvar. Nunca modifique a resposta da API diretamente — use uma cópia.

```typescript
// Estrutura de estado sugerida
type PalletArrangementState = {
  pallets: {
    // id temporário para key do React (pode ser o id original ou uuid gerado)
    tempId: string
    items: {
      orderItemId: string
      productId: string
      sku: string
      productName: string
      quantity: number
      quantityPerPallet: number
      // occupancy calculada localmente: quantity / quantityPerPallet
    }[]
  }[]
}

// Pool de quantidades disponíveis por produto
// remainingQty[orderItemId] = finalQuantity - soma das quantidades nos pallets
type RemainingQuantities = Record<string, number>
```

### Invariante principal a manter:
Para cada `orderItemId`, a soma de `quantity` em todos os pallets deve sempre igualar `finalQuantity` daquele item. O botão de salvar só deve ser habilitado quando essa invariante for satisfeita E não houver violações de regra.

---

## UX / Interface

### Onde fica o botão de entrada

Na tela/modal de detalhes do pedido, próximo ao resumo de pallets, adicionar um botão:

```
[ Compor Pallets Manualmente ]
```

Visível apenas quando status é `DRAFT` ou `UNDER_REVIEW`.

---

### Modal: "Composição de Pallets"

Layout em **duas colunas** (desktop) ou **tabs** (mobile):

```
┌─────────────────────────────────────────────────────────────────┐
│  Composição de Pallets                              [×]         │
│  BFFF - Mixed Pallet Factory                                    │
├───────────────────────────┬─────────────────────────────────────┤
│  PALLETS (2)              │  PRODUTOS DISPONÍVEIS               │
│                           │  (arraste para um pallet)           │
│  ┌─────────────────────┐  │                                     │
│  │ Pallet #1 — MISTO   │  │  ┌──────────────────────────────┐  │
│  │ 3 produtos · 5,5%   │  │  │ COCA COLA ZERO 6X310ML       │  │
│  │                     │  │  │ SKU 56061                    │  │
│  │ COCA COLA ZERO  26  │  │  │ Total: 26 un · 4,4% / pallet │  │
│  │ THZ RUBINE       1  │  │  │ Alocadas: 26  Livres: 0      │  │
│  │ FINI TRES CORES  9  │  │  └──────────────────────────────┘  │
│  │               [−]   │  │                                     │
│  └─────────────────────┘  │  ┌──────────────────────────────┐  │
│                           │  │ MATTE LEAO C VERD LIM ZR     │  │
│  ┌─────────────────────┐  │  │ SKU 119464                   │  │
│  │ Pallet #2 — MISTO   │  │  │ Total: 1 un · 0,3% / pallet │  │
│  │ 2 produtos · 0,5%   │  │  │ Alocadas: 1   Livres: 0      │  │
│  │                     │  │  └──────────────────────────────┘  │
│  │ MATTE LEAO       1  │  │                                     │
│  │ FINI MORANGO     1  │  │  ... demais produtos ...            │
│  │               [−]   │  │                                     │
│  └─────────────────────┘  │                                     │
│                           │                                     │
│  [ + Novo Pallet ]        │                                     │
│                           │                                     │
├───────────────────────────┴─────────────────────────────────────┤
│  ⚠ Todos os produtos devem estar totalmente alocados para salvar│
│                              [ Cancelar ]  [ Salvar Arranjo ]   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Regras de UX

#### Produto no painel direito (pool de produtos)
- Mostra **todos os produtos** do pedido que pertencem ao ponto de carregamento sendo editado
- Exibe: nome, SKU, quantidade total (`finalQuantity`) e quantidade já alocada em pallets
- Se `livres > 0`: destaque em amarelo/laranja — precisa ser alocado
- Se `livres === 0`: tom neutro — totalmente alocado
- Nunca remove o produto do pool, mesmo quando `livres === 0` (o usuário pode precisar realocar)

#### Interação para mover produto para um pallet
**Opção A (recomendada):** Arrastar o produto do pool e soltar em um pallet (drag-and-drop com `@dnd-kit/core` ou similar)
**Opção B:** Clicar em um produto no pool → abre um dropdown para escolher em qual pallet inserir + campo de quantidade

Ao adicionar um produto a um pallet:
1. Perguntar a quantidade a alocar (input numérico, máx = quantidade livre restante)
2. Atualizar o pool: `livres -= quantidade`
3. Se o produto já está naquele pallet: somar à quantidade existente

#### Remover produto de um pallet
Botão `[−]` ao lado de cada produto no pallet:
- Remove o produto daquele pallet
- Incrementa `livres` no pool para aquele produto

#### Criar novo pallet
Botão `[ + Novo Pallet ]` — adiciona um pallet vazio na lista. O usuário pode então arrastar produtos para ele.

#### Restrição visual de MIXED
Para pontos de carregamento tipo `MIXED`:
- Exibir no header do pallet: `X / maxProductsPerMixedPallet produtos`
- Se atingir o limite: fundo do pallet em vermelho suave, impedir adicionar mais produtos e exibir tooltip "Limite de X produtos por pallet misto atingido"

---

### Validações no Frontend (antes de enviar)

Bloqueiam o botão "Salvar Arranjo" e exibem mensagens inline:

| Regra | Mensagem |
|-------|---------|
| Produto com `livres !== 0` | "X produto(s) com quantidade não alocada" |
| Pallet com mais de `maxProductsPerMixedPallet` itens (MIXED) | "Pallet #N excede o limite de produtos" |
| Pallet vazio (sem itens) | "Pallets vazios não são permitidos" |
| Quantidade `0` em algum item | "Quantidade deve ser maior que zero" |

---

### Fluxo Completo

```
1. Usuário abre detalhes do pedido (status DRAFT ou UNDER_REVIEW)
2. Clica em "Compor Pallets Manualmente"
3. Modal abre com os pallets atuais carregados do summary
4. Frontend cria estado local: cópia dos pallets + pool de quantidades livres
5. Usuário recompõe os pallets (mover, ajustar quantidades)
6. Frontend valida em tempo real (regras acima)
7. Usuário clica "Salvar Arranjo"
8. Frontend monta o body do PATCH e chama a API
9. Em caso de sucesso: fechar modal, atualizar tela com o response
10. Em caso de erro 400: exibir a mensagem de erro do backend na modal
```

---

### Montagem do Body

```typescript
function buildPalletArrangementBody(
  state: PalletArrangementState
): { pallets: { items: { orderItemId: string; quantity: number }[] }[] } {
  return {
    pallets: state.pallets.map((pallet) => ({
      items: pallet.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity
      }))
    }))
  }
}
```

### Cálculo de Ocupação Local (exibição em tempo real)

```typescript
function calcOccupancy(quantity: number, quantityPerPallet: number): number {
  if (quantityPerPallet <= 0) return 0
  return Math.round((quantity / quantityPerPallet) * 1000) / 10 // percentual com 1 casa
}

function calcPalletTotalOccupancy(
  items: { quantity: number; quantityPerPallet: number }[]
): number {
  return items.reduce(
    (sum, item) => sum + calcOccupancy(item.quantity, item.quantityPerPallet),
    0
  )
}
```

---

## Observações de Implementação

- **Não use o `id` do pallet** existente no body do PATCH — o backend descarta todos os pallets e recria do zero. O `id` dos pallets mudará após o save.
- **Pontos de carregamento diferentes** são independentes: se o pedido tiver produtos em dois pontos de carregamento distintos, o modal pode mostrar tabs por ponto. O body do PATCH deve incluir pallets de **todos** os pontos de carregamento, não só o editado.
- O backend **recalcula o tipo** do pallet (FULL/PARTIAL/MIXED) automaticamente com base no ponto de carregamento e na ocupação.
- Use o **response do PATCH** para atualizar o estado da tela — ele retorna o summary completo já com os novos pallets e IDs.
