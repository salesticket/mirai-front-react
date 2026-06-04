# Slice 10: Frontend - Conversao de Sugestao em Order

## Objetivo

Implementar no frontend React o fluxo em que o comprador confirma os produtos selecionados em uma sugestao de compra e envia essa selecao para o backend criar a Order de reposicao.

Este slice trata apenas da integracao do frontend com a rota de conversao e da representacao da resposta para o usuario. As regras de montagem de pallets e persistencia operacional ficam no backend.

---

## Contexto de Uso

O comprador visualiza uma sugestao de compra, seleciona os itens que deseja comprar e confirma a criacao do pedido.

Ao confirmar, o frontend deve enviar ao backend os itens selecionados com suas quantidades finais. O backend retornara a Order criada, o resumo operacional e as demandas por ponto de carregamento.

Fluxo esperado:

```txt
comprador seleciona produtos
  -> frontend monta payload
  -> POST /purchase-suggestions/:id/convert-to-order
  -> backend cria order, demandas e pallets
  -> frontend exibe resumo da order criada
```

---

## Pre-condicoes

Antes de chamar a conversao:

1. A sugestao precisa estar com status `APROVADA`.
2. O comprador precisa ter pelo menos um produto selecionado.
3. Cada item enviado precisa ter `productId` e `quantity`.
4. Se a quantidade foi alterada manualmente em relacao ao item sugerido, o frontend deve enviar `editReason`.

Caso a sugestao ainda nao esteja aprovada, o frontend deve primeiro chamar o fluxo de aprovacao existente.

---

## Modal de Confirmacao do Pedido

Antes de chamar a rota de conversao, o frontend deve abrir um modal de confirmacao para o comprador revisar a selecao final.

O modal deve ser objetivo, profissional e seguir exatamente o padrao visual ja existente na aplicacao: mesmas cores, tipografia, espacamentos, bordas, componentes, estados de botao, tabelas, badges e linguagem visual usada nas telas atuais.

Nao criar um estilo novo para esta etapa. O modal deve parecer parte nativa do produto.

### Abertura do Modal

O modal deve abrir quando o comprador clicar na acao principal de fechamento/confirmacao do pedido.

Antes de abrir, validar:

1. Existe pelo menos um produto selecionado.
2. Todas as quantidades selecionadas sao maiores que zero.
3. Itens alterados manualmente possuem `editReason`, caso essa exigencia esteja ativa na tela.

Se alguma validacao falhar, nao abrir o modal de confirmacao final. Exibir o erro no proprio fluxo de selecao.

### Conteudo do Modal

O modal deve mostrar uma visao de revisao do pedido antes da criacao da Order.

Conteudo recomendado:

```txt
Titulo: Confirmar geracao do pedido
Descricao curta: Revise os produtos selecionados antes de gerar a Order.
```

Resumo superior:

```txt
Produtos selecionados
Unidades totais
Pallets estimados
Pallets cheios estimados
Pallets mistos/parciais estimados
Valor estimado, se existir
```

Lista resumida dos produtos:

```txt
SKU
Nome do produto
Ponto de carregamento
Quantidade final
Ocupacao estimada em pallets
Indicador de edicao manual, se houver
```

Agrupamento operacional, quando os dados ja estiverem disponiveis na tela:

```txt
Ponto de carregamento
Tipo do ponto
Quantidade de produtos selecionados naquele ponto
Ocupacao estimada
```

Rodape do modal:

```txt
Cancelar
Confirmar pedido
```

### Estimativa Antes da Conversao

Antes da chamada ao backend, o frontend pode exibir apenas uma estimativa baseada nos dados ja retornados pela sugestao.

Essa estimativa deve ser apresentada como previa, nao como montagem definitiva.

Textos aceitaveis:

```txt
Pallets estimados
Resumo estimado
Previa do pedido
```

Evitar textos que indiquem conclusao antes da resposta do backend:

```txt
Pallets montados
Pedido gerado
Carga final
```

### Confirmacao

Ao clicar em `Confirmar pedido`, o modal deve:

1. Bloquear os botoes.
2. Exibir estado de carregamento no botao principal.
3. Chamar `POST /purchase-suggestions/:id/convert-to-order`.
4. Aguardar a resposta do backend.

Se a request retornar sucesso, o frontend deve fechar o modal de confirmacao e exibir o resumo definitivo da Order criada.

Se a request retornar erro, manter o usuario no fluxo atual e exibir mensagem clara.

### Sucesso Apos Confirmacao

Apos a resposta positiva, exibir os dados definitivos retornados pelo backend:

```txt
Codigo da Order = response.code
Status = response.status
Produtos = response.summary.totalProducts
Unidades = response.summary.totalUnits
Pallets montados = response.summary.physicalPallets
Ocupacao total = response.summary.totalPalletOccupancy
Pallets cheios = response.summary.fullPallets
Pallets parciais = response.summary.partialPallets
Pallets mistos = response.summary.mixedPallets
```

O frontend pode apresentar isso em um modal de sucesso, toast com redirecionamento, ou tela de resumo, mantendo o padrao ja existente na aplicacao.

### Diretrizes Visuais

O modal deve respeitar o design atual da aplicacao:

1. Usar os mesmos componentes de modal/dialog ja existentes.
2. Usar os mesmos botoes primario/secundario ja usados no sistema.
3. Manter cores, fontes, raio de borda, sombras e espacamentos do layout atual.
4. Usar badges/status no mesmo padrao visual ja usado para prioridade, status ou tipo.
5. Evitar layout promocional ou chamativo.
6. Priorizar leitura rapida e decisao segura do comprador.
7. Em telas menores, permitir scroll interno no corpo do modal.
8. O rodape com botoes deve permanecer acessivel.

O modal deve ser adequado para uso operacional: denso o suficiente para revisar os dados, mas sem poluir a decisao principal.

### Cuidado de UX

O comprador deve conseguir responder rapidamente:

```txt
O que estou comprando?
Quanto estou comprando?
Quantos pallets isso representa?
De quais pontos de carregamento isso saira?
Estou confirmando a criacao de qual pedido?
```

Se essas respostas nao estiverem claras, o modal ainda nao esta completo.

---

## Endpoint

```txt
POST /purchase-suggestions/:id/convert-to-order
```

Exemplo:

```txt
POST /purchase-suggestions/17f43bc1-8213-4d8f-9078-f17aac3acd26/convert-to-order
```

Onde `:id` representa o ID da sugestao de compra.

---

## Payload

O frontend deve enviar somente os produtos selecionados pelo comprador.

```json
{
  "items": [
    {
      "purchaseSuggestionItemId": "a5e903c8-31e9-4de7-bdce-37e73a04b83f",
      "productId": "d63713c3-782d-42bb-afbb-4f6a5d8b211f",
      "quantity": 1
    },
    {
      "purchaseSuggestionItemId": "2c250abc-afcc-40cd-8cae-847f487d4b37",
      "productId": "aa4fc1e7-9758-4a64-b91b-03d597029918",
      "quantity": 1192
    }
  ]
}
```

### Campos

```txt
purchaseSuggestionItemId
```

ID do item da sugestao original. Deve ser enviado quando o item veio da sugestao.

```txt
productId
```

ID do produto selecionado.

```txt
quantity
```

Quantidade final confirmada pelo comprador. Deve ser numerica e maior que zero.

```txt
editReason
```

Texto opcional. Deve ser enviado quando o comprador alterar manualmente a quantidade em relacao ao valor sugerido originalmente.

```txt
createdById
```

Campo opcional no nivel raiz do payload. Usar somente se o frontend ja tiver o ID do usuario autenticado disponivel e o backend exigir esse vinculo.

Exemplo com edicao manual:

```json
{
  "items": [
    {
      "purchaseSuggestionItemId": "a5e903c8-31e9-4de7-bdce-37e73a04b83f",
      "productId": "d63713c3-782d-42bb-afbb-4f6a5d8b211f",
      "quantity": 12,
      "editReason": "Quantidade ajustada pelo comprador antes do fechamento"
    }
  ]
}
```

---

## Exemplo de Request no Frontend

```ts
type ConvertSuggestionToOrderPayload = {
  createdById?: string
  items: Array<{
    purchaseSuggestionItemId?: string
    productId: string
    quantity: number
    editReason?: string
  }>
}

async function convertSuggestionToOrder(
  suggestionId: string,
  payload: ConvertSuggestionToOrderPayload
) {
  const response = await fetch(
    `/purchase-suggestions/${suggestionId}/convert-to-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'Erro ao converter sugestao em pedido')
  }

  return response.json()
}
```

---

## Resposta Esperada

O backend retorna a Order criada e o resumo operacional.

```json
{
  "orderId": "6652c6f0-d14d-4eeb-9caf-5825b14741b8",
  "code": "REP-1780436529424-XPM8M2",
  "status": "UNDER_REVIEW",
  "purchaseSuggestionId": "17f43bc1-8213-4d8f-9078-f17aac3acd26",
  "summary": {
    "totalProducts": 2,
    "totalUnits": 1193,
    "totalPalletOccupancy": 1192.002,
    "fullPallets": 1192,
    "partialPallets": 1,
    "mixedPallets": 0,
    "physicalPallets": 1193,
    "estimatedValue": "0.00"
  },
  "items": [
    {
      "id": "6b4543d0-1505-47c3-8a41-1ddb90f5b550",
      "productId": "d63713c3-782d-42bb-afbb-4f6a5d8b211f",
      "sku": "141023",
      "productName": "FINI TUBES MORANGO 24X27G",
      "loadingPoint": {
        "id": 1,
        "name": "BFFF - Mixed Pallet Factory",
        "type": "MIXED",
        "maxProductsPerMixedPallet": 3
      },
      "finalQuantity": "1.000",
      "quantityPerPallet": "420.000",
      "totalPallets": "0.002",
      "manuallyEdited": false,
      "editReason": null
    }
  ],
  "loadingPointDemands": [
    {
      "id": "738c6c55-0011-44a1-b9b3-6b2b90f4d482",
      "loadingPoint": {
        "id": 1,
        "name": "BFFF - Mixed Pallet Factory",
        "type": "MIXED",
        "maxProductsPerMixedPallet": 3
      },
      "totalPallets": "1192.002",
      "summary": {
        "totalPalletOccupancy": 1192.002,
        "fullPallets": 1192,
        "partialPallets": 1,
        "mixedPallets": 0,
        "physicalPallets": 1193
      },
      "palletCount": 1193
    }
  ]
}
```

---

## Representacao no Frontend

### Resumo Principal

Usar `summary` para preencher o card/resumo apos a confirmacao:

```txt
Produtos selecionados = summary.totalProducts
Unidades = summary.totalUnits
Ocupacao em pallets = summary.totalPalletOccupancy
Pallets fisicos = summary.physicalPallets
Pallets cheios = summary.fullPallets
Pallets parciais = summary.partialPallets
Pallets mistos = summary.mixedPallets
Valor estimado = summary.estimatedValue
```

Observacao de apresentacao:

```txt
totalPalletOccupancy
```

Representa a ocupacao proporcional total em pallets. Pode ter casas decimais.

```txt
physicalPallets
```

Representa a quantidade fisica de pallets gerados. E o melhor numero para exibir como "pallets montados".

### Itens da Order

Usar `items` para exibir a lista de produtos confirmados:

```txt
SKU = item.sku
Produto = item.productName
Quantidade final = item.finalQuantity
Quantidade por pallet = item.quantityPerPallet
Ocupacao em pallets = item.totalPallets
Ponto de carregamento = item.loadingPoint.name
Tipo do ponto = item.loadingPoint.type
Editado manualmente = item.manuallyEdited
Motivo da edicao = item.editReason
```

`finalQuantity`, `quantityPerPallet` e `totalPallets` podem vir como string numerica. O frontend pode converter para `Number` apenas para formatacao visual.

### Demandas por Ponto de Carregamento

Usar `loadingPointDemands` para exibir agrupamento operacional:

```txt
Ponto de carregamento = demand.loadingPoint.name
Tipo = demand.loadingPoint.type
Total de ocupacao = demand.totalPallets
Pallets gerados = demand.palletCount
Cheios = demand.summary.fullPallets
Parciais = demand.summary.partialPallets
Mistos = demand.summary.mixedPallets
```

---

## Estados de UI

### Antes de Confirmar

O frontend deve exibir o modal de confirmacao com uma estimativa baseada nos produtos selecionados da sugestao, mas a montagem final deve ser considerada apenas apos a resposta da rota de conversao.

### Durante a Request

Bloquear o botao de confirmacao e exibir estado de carregamento.

Evitar disparos duplicados da mesma conversao.

### Sucesso

Exibir:

```txt
Pedido criado com sucesso
Codigo da Order
Status UNDER_REVIEW
Resumo de pallets
Resumo por ponto de carregamento
```

Depois do sucesso, a sugestao passa a ser considerada convertida.

### Erros Esperados

```txt
400 - Purchase suggestion must be approved before conversion
```

Mostrar mensagem indicando que a sugestao precisa ser aprovada antes de gerar o pedido.

```txt
400 - Manual quantity edit requires editReason
```

Mostrar mensagem pedindo o motivo da alteracao manual.

```txt
404 - Purchase suggestion not found
```

Mostrar mensagem indicando que a sugestao nao foi encontrada ou nao esta mais disponivel.

```txt
500
```

Mostrar mensagem generica de falha ao gerar o pedido e orientar nova tentativa.

---

## Comportamento Recomendado

1. O frontend deve montar o payload a partir da selecao atual do comprador.
2. Itens nao selecionados nao devem ser enviados.
3. A quantidade enviada deve ser a quantidade final confirmada.
4. A tela nao deve tentar recriar a regra final de pallets.
5. O resumo definitivo deve vir da resposta do backend.
6. Apos sucesso, redirecionar para a tela da Order ou exibir modal/resumo com o codigo retornado em `code`.

---

## Tipos Sugeridos para React

```ts
export type ConvertSuggestionToOrderPayload = {
  createdById?: string
  items: Array<{
    purchaseSuggestionItemId?: string
    productId: string
    quantity: number
    editReason?: string
  }>
}

export type ConvertSuggestionToOrderResponse = {
  orderId: string
  code: string
  status: 'UNDER_REVIEW'
  purchaseSuggestionId: string
  summary: {
    totalProducts: number
    totalUnits: number
    totalPalletOccupancy: number
    fullPallets: number
    partialPallets: number
    mixedPallets: number
    physicalPallets: number
    estimatedValue: string
  }
  items: Array<{
    id: string
    productId: string
    sku: string | null
    productName: string | null
    loadingPoint: {
      id: number
      name: string
      type: 'SIMPLE' | 'MIXED'
      maxProductsPerMixedPallet: number | null
    } | null
    finalQuantity: string
    quantityPerPallet: string
    totalPallets: string
    manuallyEdited: boolean
    editReason: string | null
  }>
  loadingPointDemands: Array<{
    id: string
    loadingPoint: {
      id: number
      name: string
      type: 'SIMPLE' | 'MIXED'
      maxProductsPerMixedPallet: number | null
    }
    totalPallets: string
    summary: {
      totalPalletOccupancy: number
      fullPallets: number
      partialPallets: number
      mixedPallets: number
      physicalPallets: number
    }
    palletCount: number
  }>
}
```

---

## Criterios de Aceite

1. O frontend envia somente os itens selecionados.
2. A chamada usa `POST /purchase-suggestions/:id/convert-to-order`.
3. Antes da chamada, o frontend exibe um modal de confirmacao do pedido.
4. O modal segue o mesmo padrao visual, cores, fontes e componentes ja existentes na aplicacao.
5. O modal mostra produtos selecionados, unidades, pallets estimados e pontos de carregamento.
6. O botao de confirmar fica bloqueado durante o envio.
7. Erros 400 e 404 sao tratados com mensagem compreensivel.
8. Em sucesso, o frontend mostra `code`, `status`, `summary` e agrupamento por ponto de carregamento.
9. O numero de pallets montados exibido usa `summary.physicalPallets`.
10. A ocupacao proporcional exibida usa `summary.totalPalletOccupancy`.
11. A tela nao recalcula a montagem definitiva de pallets; apenas apresenta o retorno do backend.
