# Slice 9: Frontend React para Sugestões Inteligentes de Compra

## Objetivo

Implementar no frontend React a tela e a camada de dados responsáveis por consumir o backend de **Sugestões Inteligentes de Compra**, renderizando a recomendação gerada pelo OpenRouter e validada pelo backend.

Este slice deve orientar o agente do frontend a implementar:

1. chamada para geração de sugestão;
2. listagem de sugestões anteriores;
3. detalhe da sugestão com itens recomendados;
4. tabela operacional para o comprador revisar os itens;
5. indicadores de prioridade, ação recomendada, pallets e validação;
6. aprovação e cancelamento da sugestão;
7. normalização do contrato retornado pelo backend.

O frontend não deve recalcular a decisão de compra. Ele deve exibir, filtrar, ordenar, revisar e acionar fluxos com base nos dados já calculados pelo backend.

---

## Dependências

Este slice depende dos seguintes slices:

1. **Slice 2: Produtos e Estoque das Filiais**
   - Produtos, SKUs, categorias, estoque atual, média de consumo e quantidade por pallet.

2. **Slice 8: Sugestão Inteligente de Compra com IA via OpenRouter**
   - Endpoint de geração.
   - Persistência de sugestões.
   - Itens validados pelo backend.
   - Status, origem, prioridade e ação recomendada.

---

## Escopo deste Slice

Este slice deve implementar no frontend:

1. Service/API client para `purchase-suggestions`.
2. Tipos TypeScript do contrato recebido do backend.
3. Normalizador para transformar strings numéricas em `number`.
4. Tela principal de geração e histórico.
5. Tela ou painel de detalhe da sugestão.
6. Tabela de itens sugeridos.
7. Cards/resumo com totais da sugestão.
8. Filtros por prioridade, ação recomendada, SKU, nome do produto e validação.
9. Ordenação por prioridade, dias de estoque, quantidade final e pallets.
10. Ações de aprovar e cancelar.
11. Estados de loading, erro, vazio e sucesso.

---

## Fora do Escopo

Não implementar neste slice:

- cálculo de sugestão no frontend;
- edição persistente de quantidade sugerida, salvo se o backend expuser endpoint específico;
- conversão em order de reposição;
- montagem de pallets físicos;
- montagem de carga ou viagem;
- integração direta com OpenRouter;
- exibição de payload bruto de prompt, request ou response da IA.

---

## Endpoints do Backend

Base:

```txt
/purchase-suggestions
```

### Gerar sugestão

```txt
POST /purchase-suggestions/generate
```

Body:

```ts
type GeneratePurchaseSuggestionRequest = {
  filial_id: number
  categoria_id?: number
  somente_produtos_ativos?: boolean
  somente_com_estoque_baixo?: boolean
  criado_por_id?: string
}
```

Uso esperado:

- `filial_id` é obrigatório.
- `categoria_id` é opcional.
- `somente_produtos_ativos` deve iniciar como `true`.
- `somente_com_estoque_baixo` pode iniciar como `true` se a tela for focada apenas em reposição, ou `false` se a tela quiser auditar todos os produtos analisados.

### Listar sugestões

```txt
GET /purchase-suggestions
```

Retorna o histórico resumido, sem itens.

### Buscar detalhe

```txt
GET /purchase-suggestions/:id
```

Retorna a sugestão com `items` ou `itens`, conforme formatação do backend. O frontend deve suportar ambos defensivamente.

### Buscar apenas itens

```txt
GET /purchase-suggestions/:id/items
```

Retorna apenas os itens da sugestão.

### Aprovar sugestão

```txt
POST /purchase-suggestions/:id/approve
```

Body:

```ts
type ApprovePurchaseSuggestionRequest = {
  aprovado_por_id?: string
}
```

### Cancelar sugestão

```txt
POST /purchase-suggestions/:id/cancel
```

---

## Contrato Real da Resposta de Geração

O backend atualmente retorna o cabeçalho da sugestão em snake_case e os itens em camelCase:

```ts
type PurchaseSuggestionGenerateResponse = {
  id: string
  status: PurchaseSuggestionStatus
  origem: PurchaseSuggestionOrigin
  filial_id: number
  resumo_geral: string | null
  total_produtos_analisados: number
  total_itens_sugeridos: number
  total_pallets_sugeridos: string | null
  erro: string | null
  itens: PurchaseSuggestionItemApi[]
}
```

Item retornado:

```ts
type PurchaseSuggestionItemApi = {
  id: string
  purchaseSuggestionId: string
  productId: string
  categoryId: number | null
  sku: string
  productName: string
  inventoryQuantity: string
  averageDailyConsumption: string
  availableStockDays: string | null
  safetyStockDays: number
  quantityPerPallet: string
  suggestedQuantity: string
  finalQuantity: string
  totalPallets: string
  priority: PurchaseSuggestionPriority
  recommendedAction: PurchaseSuggestionAction
  justification: string | null
  confidence: string | null
  backendValidated: boolean
  validationReason: string | null
  manuallyEdited: boolean
  editReason: string | null
  createdAt?: string
  updatedAt?: string
}
```

Campos `createdAt` e `updatedAt` não devem ser exibidos na tabela operacional dos itens.

---

## Enums no Frontend

```ts
type PurchaseSuggestionStatus =
  | 'PENDENTE'
  | 'PROCESSANDO'
  | 'GERADA'
  | 'GERADA_COM_ALERTAS'
  | 'FALHOU'
  | 'APROVADA'
  | 'CANCELADA'
  | 'CONVERTIDA_EM_ORDER'

type PurchaseSuggestionOrigin =
  | 'IA_OPENROUTER'
  | 'FALLBACK_DETERMINISTICO'
  | 'MANUAL'

type PurchaseSuggestionPriority =
  | 'CRITICA'
  | 'ALTA'
  | 'MEDIA'
  | 'BAIXA'
  | 'SEM_COMPRA'
  | 'REVISAR'

type PurchaseSuggestionAction =
  | 'COMPRAR'
  | 'NAO_COMPRAR'
  | 'REVISAR'
```

---

## Modelo Normalizado para a UI

O frontend deve normalizar a resposta antes de renderizar. A UI deve trabalhar com números reais, não com strings decimais vindas do banco.

```ts
type PurchaseSuggestion = {
  id: string
  status: PurchaseSuggestionStatus
  origin: PurchaseSuggestionOrigin
  branchId: number
  branchName?: string
  generalSummary: string | null
  totalProductsAnalyzed: number
  totalItemsSuggested: number
  totalPalletsSuggested: number
  error: string | null
  items: PurchaseSuggestionItem[]
}

type PurchaseSuggestionItem = {
  id: string
  suggestionId: string
  productId: string
  categoryId: number | null
  sku: string
  productName: string
  inventoryQuantity: number
  averageDailyConsumption: number
  availableStockDays: number | null
  safetyStockDays: number
  quantityPerPallet: number
  suggestedQuantity: number
  finalQuantity: number
  totalPallets: number
  priority: PurchaseSuggestionPriority
  recommendedAction: PurchaseSuggestionAction
  justification: string | null
  confidence: number | null
  backendValidated: boolean
  validationReason: string | null
  manuallyEdited: boolean
  editReason: string | null
}
```

Normalizador recomendado:

```ts
const toNumber = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? 0 : Number(value)

const toNullableNumber = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? null : Number(value)
```

Regras de normalização:

1. `total_pallets_sugeridos` deve virar `totalPalletsSuggested`.
2. `filial_id` deve virar `branchId`.
3. `origem` deve virar `origin`.
4. `resumo_geral` deve virar `generalSummary`.
5. `itens` ou `items` deve virar sempre `items`.
6. Campos numéricos dos itens devem virar `number`.
7. `availableStockDays` e `confidence` podem ser `null`.
8. `createdAt` e `updatedAt` dos itens devem ser ignorados para a tabela.

---

## Estrutura Recomendada no Frontend

```txt
src/
  features/
    purchase-suggestions/
      api/
        purchaseSuggestionsApi.ts
      components/
        PurchaseSuggestionSummary.tsx
        PurchaseSuggestionFilters.tsx
        PurchaseSuggestionItemsTable.tsx
        PurchaseSuggestionStatusBadge.tsx
        PurchaseSuggestionPriorityBadge.tsx
        PurchaseSuggestionActionBadge.tsx
      pages/
        PurchaseSuggestionsPage.tsx
        PurchaseSuggestionDetailPage.tsx
      types/
        purchaseSuggestion.types.ts
      utils/
        normalizePurchaseSuggestion.ts
        formatPurchaseSuggestion.ts
```

Se o projeto já usa outra convenção de pastas, manter o padrão existente e aplicar os mesmos limites de responsabilidade.

---

## Tela Principal

A tela principal deve permitir:

1. selecionar filial;
2. selecionar categoria opcional;
3. alternar `somente_produtos_ativos`;
4. alternar `somente_com_estoque_baixo`;
5. gerar nova sugestão;
6. visualizar histórico de sugestões;
7. abrir detalhe de uma sugestão existente.

Resumo visual recomendado:

| Indicador | Fonte |
|---|---|
| Produtos analisados | `totalProductsAnalyzed` |
| Itens sugeridos | `totalItemsSuggested` |
| Pallets sugeridos | `totalPalletsSuggested` |
| Status | `status` |
| Origem | `origin` |
| Resumo | `generalSummary` |

---

## Tabela de Itens

Colunas recomendadas:

| Coluna | Campo |
|---|---|
| SKU | `sku` |
| Produto | `productName` |
| Estoque atual | `inventoryQuantity` |
| Giro/dia | `averageDailyConsumption` |
| Dias disponíveis | `availableStockDays` |
| Segurança | `safetyStockDays` |
| Sugerido | `suggestedQuantity` |
| Compra final | `finalQuantity` |
| Pallets | `totalPallets` |
| Prioridade | `priority` |
| Ação | `recommendedAction` |
| Validação | `backendValidated` |
| Justificativa | `justification` |

Não exibir por padrão:

- `id`;
- `purchaseSuggestionId`;
- `productId`;
- `categoryId`;
- `quantityPerPallet`, exceto em tooltip ou coluna opcional;
- `confidence`, exceto em detalhe técnico;
- `createdAt`;
- `updatedAt`.

---

## Regras de Exibição

### Prioridade

Mapear prioridade para badges:

| Prioridade | Apresentação |
|---|---|
| `CRITICA` | Vermelho forte |
| `ALTA` | Vermelho |
| `MEDIA` | Amarelo |
| `BAIXA` | Azul ou neutro |
| `SEM_COMPRA` | Cinza |
| `REVISAR` | Roxo ou laranja |

### Ação recomendada

| Ação | Apresentação |
|---|---|
| `COMPRAR` | Destaque positivo/ação principal |
| `NAO_COMPRAR` | Neutro |
| `REVISAR` | Alerta para revisão humana |

### Validação do backend

Quando `backendValidated = true`:

```txt
Validado
```

Quando `backendValidated = false`:

```txt
Ajustado pelo backend
```

Se `validationReason` existir, mostrar em tooltip, popover ou linha expansível.

### Dias disponíveis

Regras visuais:

1. `availableStockDays === null`: exibir `Sem giro`.
2. valor menor que zero: exibir valor e destacar como crítico.
3. valor menor que `safetyStockDays`: destacar como abaixo da segurança.
4. valor maior ou igual a `safetyStockDays`: exibir como coberto.

O frontend pode aplicar cor visual, mas não deve alterar a prioridade calculada pelo backend.

---

## Filtros e Ordenação

Filtros mínimos:

1. busca por SKU ou nome do produto;
2. prioridade;
3. ação recomendada;
4. apenas itens para comprar;
5. apenas itens com alerta de validação;
6. apenas itens revisados manualmente, se houver.

Ordenação inicial recomendada:

1. `recommendedAction = COMPRAR` primeiro;
2. prioridade `CRITICA`, `ALTA`, `MEDIA`, `BAIXA`, `REVISAR`, `SEM_COMPRA`;
3. menor `availableStockDays`;
4. maior `finalQuantity`.

---

## Estados da UI

### Loading de geração

Enquanto `POST /purchase-suggestions/generate` estiver em andamento:

- bloquear botão de gerar;
- manter filtros visíveis;
- exibir estado de processamento;
- evitar múltiplos submits simultâneos.

### Erro de geração

Exibir mensagem útil se o backend retornar erro, por exemplo:

```txt
Não foi possível gerar a sugestão para esta filial.
```

Se `erro` vier dentro da resposta com status `GERADA_COM_ALERTAS`, a sugestão ainda deve ser exibida, pois o backend pode ter usado fallback determinístico.

### Estado vazio

Quando não houver sugestão selecionada:

```txt
Selecione uma filial e gere uma sugestão de compra.
```

Quando a sugestão não tiver itens:

```txt
Nenhum item exige compra neste momento.
```

---

## Ações do Comprador

### Aprovar

Disponível apenas para:

```txt
GERADA
GERADA_COM_ALERTAS
```

Ao aprovar:

1. chamar `POST /purchase-suggestions/:id/approve`;
2. atualizar status local para `APROVADA`;
3. bloquear nova aprovação;
4. manter a tabela somente leitura.

### Cancelar

Disponível para sugestões ainda não aprovadas ou convertidas.

Ao cancelar:

1. chamar `POST /purchase-suggestions/:id/cancel`;
2. atualizar status local para `CANCELADA`;
3. bloquear aprovação.

---

## Diferença para a Estrutura Mockada Atual

A estrutura mockada atual do frontend está neste formato:

```ts
{
  product: {
    id: 'p-001',
    sku: 'BEB-COCA-2L',
    name: 'Coca-Cola 2L Pet',
    currentStock: 18,
    average30d: 320,
    safetyStock: 80,
    unitsPerPallet: 24
  },
  suggestion: {
    finalSuggestion: 2808,
    stockDays: 0.09,
    priority: 'critical',
    confidence: 'low',
    reason: '...',
    palletCount: 117
  }
}
```

O backend real retorna uma linha plana por item:

```ts
{
  sku: '1017',
  productName: 'MENTOS GARRAFA 6X28',
  inventoryQuantity: '-5.000',
  averageDailyConsumption: '0.060',
  availableStockDays: '-83.333',
  safetyStockDays: 10,
  suggestedQuantity: '5.600',
  finalQuantity: '6.000',
  totalPallets: '6.000',
  priority: 'ALTA',
  recommendedAction: 'COMPRAR',
  justification: 'Estoque negativo e abaixo do necessário para segurança.'
}
```

Portanto, o frontend deve substituir o modelo `product + suggestion` por `PurchaseSuggestionItem` normalizado, ou criar um adapter temporário se a tela atual ainda depender desse formato.

Adapter temporário possível:

```ts
function toLegacySuggestionCard(item: PurchaseSuggestionItem) {
  return {
    product: {
      id: item.productId,
      sku: item.sku,
      name: item.productName,
      category: null,
      currentStock: item.inventoryQuantity,
      average30d: null,
      average15d: null,
      average1d: item.averageDailyConsumption,
      safetyStock: item.safetyStockDays,
      unitsPerPallet: item.quantityPerPallet
    },
    suggestion: {
      productId: item.productId,
      averageTurnover: item.averageDailyConsumption,
      rawSuggestion: item.suggestedQuantity,
      finalSuggestion: item.finalQuantity,
      editedSuggestion: item.finalQuantity,
      stockDays: item.availableStockDays,
      priority: item.priority,
      confidence: item.confidence,
      reason: item.justification,
      palletCount: item.totalPallets,
      multipleApplied: item.quantityPerPallet,
      supplierShort: false
    }
  }
}
```

Esse adapter deve ser tratado como transição. O modelo principal da feature deve ser o contrato real do backend.

---

## Critérios de Aceite

1. O frontend consegue chamar `POST /purchase-suggestions/generate` com uma filial selecionada.
2. A resposta é normalizada para `PurchaseSuggestion`.
3. A tabela renderiza os itens sem exibir `createdAt` e `updatedAt`.
4. Strings numéricas do backend aparecem formatadas como números.
5. Itens `COMPRAR` aparecem destacados e ordenados no topo.
6. Prioridades `CRITICA`, `ALTA`, `MEDIA`, `BAIXA`, `SEM_COMPRA` e `REVISAR` têm badge visual.
7. `validationReason` é acessível ao usuário quando houver ajuste do backend.
8. Sugestões com `GERADA_COM_ALERTAS` continuam utilizáveis.
9. Aprovação chama o endpoint correto e atualiza o status.
10. Cancelamento chama o endpoint correto e atualiza o status.
11. Histórico de sugestões pode ser listado e uma sugestão pode ser aberta em detalhe.
12. O frontend não recalcula quantidade final, pallets, prioridade ou ação recomendada.

