# Slice 8: Sugestão Inteligente de Compra com IA via OpenRouter

## Objetivo

Implementar a feature principal de **Sugestão Inteligente de Compra**, responsável por analisar o estoque atual da filial e sugerir quais produtos devem ser comprados com base em duas variáveis principais:

1. **Giro de estoque / média de consumo**
2. **Parâmetro de segurança do estoque**

A sugestão será exibida para o comprador no frontend, indicando quais itens precisam de reposição, qual quantidade comprar, quantos pallets serão necessários e qual a justificativa da recomendação.

Este slice deve integrar o backend com o **OpenRouter**, utilizando um modelo de IA, preferencialmente Gemini, para gerar recomendações estruturadas a partir dos dados reais armazenados no banco.

---

## Decisão Arquitetural

Criar uma feature separada para a sugestão de compra:

```txt
ai_purchase_suggestions
```

ou, em nomenclatura mais alinhada ao domínio:

```txt
purchase_suggestions
```

Essa feature não deve substituir os dados calculáveis do sistema.

O backend continua responsável por:

- buscar os dados no banco;
- validar se os dados estão completos;
- montar o payload enviado para a IA;
- definir o schema de resposta esperado;
- validar a resposta recebida;
- salvar a sugestão;
- auditar a decisão;
- proteger o sistema contra resposta inválida da IA.

A IA será responsável por:

- analisar os produtos;
- priorizar itens;
- sugerir compra;
- explicar a sugestão em linguagem amigável;
- retornar a recomendação em formato estruturado.

---

## Princípio Principal

A IA deve sugerir, mas o sistema deve validar.

```txt
IA = motor de recomendação e explicação
Backend = fonte da verdade, validação, persistência e auditoria
Frontend = visualização e revisão pelo comprador
```

---

## Dependências

Este slice depende dos seguintes slices anteriores:

1. **Slice 0: Foundation, Auditoria e Parâmetros Globais**
   - Usuário autenticado.
   - Auditoria global.
   - Parâmetros globais.
   - Logs de decisão.
   - Variáveis de ambiente configuradas.

2. **Slice 1: Cadastros Logísticos Base**
   - Filiais cadastradas.

3. **Slice 2: Produtos e Estoque das Filiais**
   - Produtos cadastrados.
   - Categorias cadastradas.
   - Estoque por filial disponível.
   - Média de consumo por produto.
   - Quantidade por pallet.
   - Parâmetro de segurança de estoque.

4. **Slice 3: Pedidos / Orders de Reposição**
   - Estrutura futura para transformar sugestão aprovada em Order.

5. **Slice 7: Auditoria da Decisão do Sistema**
   - Logs explicáveis das decisões automáticas.

---

## Escopo deste Slice

Este slice deve implementar:

1. Configuração do provider OpenRouter.
2. Serviço interno para chamada de IA.
3. Geração de payload com dados de estoque da filial.
4. Prompt de sistema para sugestão de compra.
5. Schema estruturado de resposta.
6. Validação da resposta da IA.
7. Persistência da sugestão gerada.
8. Persistência dos itens sugeridos.
9. Explicação da recomendação.
10. Classificação de prioridade dos itens.
11. Auditoria da decisão da IA.
12. Fallback para cálculo determinístico simples em caso de falha.
13. Endpoint para gerar sugestão.
14. Endpoint para consultar sugestões anteriores.
15. Endpoint para aprovar sugestão e futuramente gerar Order.

---

## Fora do Escopo

Não implementar neste slice:

- montagem de cargas;
- geração de pallets físicos;
- escolha de caminhão;
- escolha de motorista;
- geração de viagem;
- integração direta com estoque de fornecedores;
- compra automática sem aprovação humana;
- baixa de estoque;
- entrada fiscal;
- integração com ERP externo.

---

## Observação sobre OpenRouter

O OpenRouter deve ser usado como camada unificada para acessar o modelo de IA. Isso evita acoplar o projeto diretamente a um único provider e permite trocar o modelo futuramente sem alterar a regra de negócio.

A feature deve preferir respostas estruturadas, porque a sugestão precisa ser salva no banco e exibida de forma confiável no frontend.

---

## Variáveis de Ambiente

Adicionar variáveis específicas para integração com OpenRouter:

```env
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-2.5-flash
OPENROUTER_APP_NAME=Mirai Reposicao Estoque
OPENROUTER_SITE_URL=
AI_PURCHASE_SUGGESTION_ENABLED=true
AI_PURCHASE_SUGGESTION_TIMEOUT_MS=30000
AI_PURCHASE_SUGGESTION_MAX_ITEMS=200
```

---

## Observações sobre o modelo

O modelo deve ser configurável por variável de ambiente para permitir troca futura sem alteração de código.

Exemplos possíveis:

```txt
google/gemini-2.5-flash
google/gemini-2.5-pro
openrouter/auto
```

A escolha inicial recomendada é usar um modelo Gemini rápido e com bom custo-benefício para análise tabular.

O sistema não deve deixar o nome do modelo fixo dentro da regra de negócio.

---

## Entidades

## Sugestão de Compra

Criar tabela:

```txt
purchase_suggestion
```

Representa uma execução de sugestão de compra para uma filial em uma data específica.

| Campo | Tipo | Obrigatório | Descrição |
|---|---:|---:|---|
| `id` | UUID | Sim | Identificador único |
| `filial_id` | UUID | Sim | Filial analisada |
| `status` | Enum | Sim | Status da sugestão |
| `origem` | Enum | Sim | IA, fallback ou manual |
| `modelo_ia` | String | Não | Modelo usado no OpenRouter |
| `provider_ia` | String | Não | Provider utilizado |
| `data_referencia_estoque` | DateTime | Sim | Data da leitura do estoque |
| `total_produtos_analisados` | Int | Sim | Quantidade de produtos enviados para análise |
| `total_itens_sugeridos` | Int | Sim | Quantidade de itens com compra recomendada |
| `total_pallets_sugeridos` | Decimal | Não | Total estimado de pallets |
| `resumo_geral` | String | Não | Resumo amigável da IA |
| `prompt_hash` | String | Não | Hash do prompt/payload para rastreabilidade |
| `request_payload` | JSONB | Não | Dados enviados para IA |
| `response_payload` | JSONB | Não | Resposta bruta validada da IA |
| `erro` | String | Não | Erro ocorrido, se houver |
| `criado_por_id` | UUID | Não | Usuário que solicitou a sugestão |
| `aprovado_por_id` | UUID | Não | Usuário que aprovou |
| `aprovado_em` | DateTime | Não | Data de aprovação |
| `created_at` | DateTime | Sim | Data de criação |
| `updated_at` | DateTime | Sim | Data de atualização |
| `deleted_at` | DateTime | Não | Exclusão lógica |

---

## Item da Sugestão de Compra

Criar tabela:

```txt
purchase_suggestion_item
```

Representa cada produto analisado e sua recomendação.

| Campo | Tipo | Obrigatório | Descrição |
|---|---:|---:|---|
| `id` | UUID | Sim | Identificador único |
| `purchase_suggestion_id` | UUID | Sim | Sugestão de compra |
| `produto_id` | UUID | Sim | Produto analisado |
| `categoria_id` | UUID | Não | Categoria do produto |
| `sku` | String | Sim | Snapshot do SKU |
| `produto_nome` | String | Sim | Snapshot do nome |
| `quantidade_estoque` | Decimal | Sim | Estoque atual no momento da análise |
| `media_consumo_diario` | Decimal | Sim | Giro/média usada |
| `dias_estoque_disponivel` | Decimal | Não | Dias disponíveis calculados |
| `dias_estoque_seguranca` | Int | Sim | Parâmetro de segurança usado |
| `quantidade_por_pallet` | Decimal | Sim | Quantidade por pallet no momento da análise |
| `quantidade_sugerida` | Decimal | Sim | Quantidade sugerida pela IA |
| `quantidade_final` | Decimal | Sim | Quantidade final validada/arredondada |
| `total_pallets` | Decimal | Sim | Total de pallets sugeridos |
| `prioridade` | Enum | Sim | Prioridade da compra |
| `acao_recomendada` | Enum | Sim | Comprar, não comprar, revisar |
| `justificativa` | String | Não | Explicação amigável |
| `confianca` | Decimal | Não | Confiança retornada pela IA, se houver |
| `validado_backend` | Boolean | Sim | Indica se passou nas validações locais |
| `motivo_validacao` | String | Não | Ajuste ou bloqueio feito pelo backend |
| `editado_manual` | Boolean | Sim | Indica edição pelo usuário |
| `motivo_edicao` | String | Não | Motivo da edição manual |
| `created_at` | DateTime | Sim | Data de criação |
| `updated_at` | DateTime | Sim | Data de atualização |

---

## Enums

### PurchaseSuggestionStatus

```txt
PENDENTE
PROCESSANDO
GERADA
GERADA_COM_ALERTAS
FALHOU
APROVADA
CANCELADA
CONVERTIDA_EM_ORDER
```

---

### PurchaseSuggestionOrigin

```txt
IA_OPENROUTER
FALLBACK_DETERMINISTICO
MANUAL
```

---

### PurchaseSuggestionPriority

```txt
CRITICA
ALTA
MEDIA
BAIXA
SEM_COMPRA
REVISAR
```

---

### PurchaseSuggestionAction

```txt
COMPRAR
NAO_COMPRAR
REVISAR
```

---

## Dados mínimos necessários para a IA

Para cada produto enviado para a IA, o backend deve enviar apenas os dados necessários para a decisão:

```json
{
  "filial": {
    "id": "uuid",
    "nome": "Filial Itabuna",
    "cidade": "Itabuna"
  },
  "parametros": {
    "criterios": [
      "giro_estoque",
      "dias_estoque_seguranca"
    ],
    "arredondar_para_pallet": true
  },
  "produtos": [
    {
      "produto_id": "uuid",
      "sku": "56600",
      "nome": "Coca-Cola Original PET 2L (08)",
      "categoria": "004 REF KS",
      "quantidade_estoque": 680,
      "media_consumo_diario": 30.95,
      "dias_estoque_seguranca": 10,
      "quantidade_por_pallet": 120
    }
  ]
}
```

---

## Cálculos que o backend deve fazer antes da IA

Mesmo usando IA, o backend deve calcular alguns campos básicos para evitar ambiguidade:

```txt
dias_estoque_disponivel = quantidade_estoque / media_consumo_diario
```

Quando `media_consumo_diario = 0`:

```txt
dias_estoque_disponivel = null
```

O backend também pode enviar:

```txt
estoque_necessario_seguranca = media_consumo_diario * dias_estoque_seguranca
deficit_para_seguranca = estoque_necessario_seguranca - quantidade_estoque
```

Esses valores ajudam a IA a explicar melhor a decisão.

---

## Responsabilidade da IA

A IA deve decidir:

1. Se o produto precisa ser comprado.
2. Qual a prioridade da compra.
3. Qual quantidade sugerida.
4. Qual a quantidade final arredondada para pallet.
5. Quantos pallets serão necessários.
6. Qual a justificativa da sugestão.
7. Se algum item precisa de revisão humana.

---

## Responsabilidade do Backend após resposta da IA

Após receber a resposta da IA, o backend deve:

1. Validar se o JSON está no formato esperado.
2. Validar se todos os produtos retornados existem no payload original.
3. Validar se quantidades são numéricas.
4. Impedir quantidade negativa.
5. Impedir compra para produto com média de consumo zero, exceto se marcado como revisão.
6. Recalcular o arredondamento para pallet.
7. Ajustar `quantidade_final` se a IA retornar valor fora do múltiplo de pallet.
8. Marcar o item como `validado_backend = true` ou `false`.
9. Salvar a sugestão.
10. Registrar log de decisão.

---

## Regra principal de sugestão

A decisão deve considerar apenas:

```txt
giro de estoque / média de consumo
parâmetro de segurança do estoque
```

A sugestão deve seguir a lógica conceitual:

```txt
dias_estoque_disponivel = quantidade_estoque / media_consumo_diario
```

Se:

```txt
dias_estoque_disponivel < dias_estoque_seguranca
```

Então o produto deve ser candidato à compra.

A quantidade mínima de reposição pode partir de:

```txt
estoque_necessario_seguranca = media_consumo_diario * dias_estoque_seguranca

deficit = estoque_necessario_seguranca - quantidade_estoque
```

Depois deve ser arredondado para pallet:

```txt
total_pallets = ceil(deficit / quantidade_por_pallet)

quantidade_final = total_pallets * quantidade_por_pallet
```

---

## Importante sobre a IA

A IA pode melhorar a explicação e priorização, mas não deve violar as regras matemáticas mínimas.

Exemplo:

Se o déficit calculado for 260 unidades e o pallet possuir 120 unidades:

```txt
ceil(260 / 120) = 3 pallets
quantidade_final = 360 unidades
```

Se a IA retornar 250, o backend deve corrigir para 360.

---

## Prompt de Sistema Recomendado

```txt
Você é um assistente especialista em reposição de estoque para centros de distribuição e filiais.

Sua tarefa é analisar produtos de uma filial e sugerir compra apenas com base em:
1. giro de estoque, representado pela média de consumo diário;
2. parâmetro de segurança do estoque, representado por dias mínimos desejados de estoque.

Não utilize critérios externos.
Não invente produtos.
Não altere SKUs.
Não retorne produtos que não foram enviados.
Não use informações fora do payload.

Para cada produto:
- calcule os dias de estoque disponível;
- compare com os dias de estoque de segurança;
- se estiver abaixo do parâmetro de segurança, recomende compra;
- arredonde a quantidade final para múltiplos de pallet;
- informe a prioridade;
- explique a decisão de forma objetiva para o comprador.

Retorne obrigatoriamente JSON válido no schema solicitado.
```

---

## Prompt de Usuário Recomendado

```txt
Analise os produtos abaixo e gere uma sugestão de compra para a filial informada.

Critérios obrigatórios:
- usar apenas média de consumo diário;
- usar apenas dias de estoque de segurança;
- arredondar compra para múltiplos de pallet;
- não sugerir compra para itens sem consumo, a menos que seja necessário revisar;
- retornar justificativa curta e objetiva.

Dados:
{{payload_json}}
```

---

## Schema de Resposta Esperado

O backend deve exigir resposta estruturada com formato semelhante a:

```json
{
  "resumo_geral": "Foram analisados 120 produtos. 18 possuem necessidade de compra.",
  "itens": [
    {
      "produto_id": "uuid",
      "sku": "56600",
      "acao_recomendada": "COMPRAR",
      "prioridade": "CRITICA",
      "dias_estoque_disponivel": 6.2,
      "dias_estoque_seguranca": 10,
      "quantidade_sugerida": 118,
      "quantidade_final": 120,
      "total_pallets": 1,
      "justificativa": "Estoque disponível abaixo do parâmetro de segurança.",
      "confianca": 0.95
    }
  ]
}
```

---

## JSON Schema recomendado

```json
{
  "type": "object",
  "properties": {
    "resumo_geral": {
      "type": "string"
    },
    "itens": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "produto_id": { "type": "string" },
          "sku": { "type": "string" },
          "acao_recomendada": {
            "type": "string",
            "enum": ["COMPRAR", "NAO_COMPRAR", "REVISAR"]
          },
          "prioridade": {
            "type": "string",
            "enum": ["CRITICA", "ALTA", "MEDIA", "BAIXA", "SEM_COMPRA", "REVISAR"]
          },
          "dias_estoque_disponivel": {
            "type": ["number", "null"]
          },
          "dias_estoque_seguranca": {
            "type": "number"
          },
          "quantidade_sugerida": {
            "type": "number"
          },
          "quantidade_final": {
            "type": "number"
          },
          "total_pallets": {
            "type": "number"
          },
          "justificativa": {
            "type": "string"
          },
          "confianca": {
            "type": ["number", "null"]
          }
        },
        "required": [
          "produto_id",
          "sku",
          "acao_recomendada",
          "prioridade",
          "dias_estoque_disponivel",
          "dias_estoque_seguranca",
          "quantidade_sugerida",
          "quantidade_final",
          "total_pallets",
          "justificativa"
        ]
      }
    }
  },
  "required": ["resumo_geral", "itens"]
}
```

---

## Serviço de Integração

Criar um serviço isolado:

```txt
OpenRouterAiService
```

Responsabilidades:

1. Montar headers.
2. Enviar request para OpenRouter.
3. Definir modelo.
4. Definir temperature baixa.
5. Solicitar resposta estruturada.
6. Tratar timeout.
7. Tratar erro HTTP.
8. Tratar resposta inválida.
9. Retornar resultado normalizado para o domínio.

---

## Headers recomendados

```txt
Authorization: Bearer ${OPENROUTER_API_KEY}
Content-Type: application/json
HTTP-Referer: ${OPENROUTER_SITE_URL}
X-Title: ${OPENROUTER_APP_NAME}
```

---

## Parâmetros recomendados

```json
{
  "model": "google/gemini-2.5-flash",
  "temperature": 0.1,
  "max_tokens": 4000,
  "response_format": {
    "type": "json_schema"
  }
}
```

---

## Observação sobre temperature

Usar temperature baixa porque esta feature precisa de consistência, não criatividade.

Recomendado:

```txt
temperature = 0.0 até 0.2
```

---

## Fluxo de Execução

```txt
1. Usuário solicita sugestão no frontend
2. Backend recebe filial_id e filtros opcionais
3. Backend busca branch_product_inventory
4. Backend carrega dados do produto
5. Backend carrega quantidade por pallet
6. Backend calcula dias_estoque_disponivel
7. Backend monta payload limpo para IA
8. Backend chama OpenRouter
9. IA retorna JSON estruturado
10. Backend valida resposta
11. Backend corrige arredondamento de pallets se necessário
12. Backend salva purchase_suggestion
13. Backend salva purchase_suggestion_item
14. Backend registra decisao_sistema_log
15. Backend retorna sugestão para frontend
16. Comprador revisa e aprova
17. Sugestão aprovada pode virar Order
```

---

## Endpoint para gerar sugestão

```txt
POST /purchase-suggestions/generate
```

Payload:

```json
{
  "filial_id": "id",
  "categoria_id": "id opcional",
  "somente_produtos_ativos": true,
  "somente_com_estoque_baixo": false
}
```

Resposta:

```json
{
  "id": "uuid",
  "status": "GERADA",
  "filial_id": "uuid",
  "resumo_geral": "Foram analisados 80 produtos. 12 possuem sugestão de compra.",
  "total_produtos_analisados": 80,
  "total_itens_sugeridos": 12,
  "itens": [
    {
      "produto_id": "uuid",
      "sku": "56600",
      "produto_nome": "Coca-Cola Original PET 2L (08)",
      "quantidade_estoque": 680,
      "media_consumo_diario": 30.95,
      "dias_estoque_disponivel": 21.97,
      "dias_estoque_seguranca": 30,
      "quantidade_sugerida": 248.5,
      "quantidade_final": 360,
      "total_pallets": 3,
      "prioridade": "ALTA",
      "acao_recomendada": "COMPRAR",
      "justificativa": "O estoque atual cobre menos dias do que o parâmetro de segurança definido."
    }
  ]
}
```

---

## Outros Endpoints Sugeridos

```txt
GET    /purchase-suggestions
GET    /purchase-suggestions/:id
GET    /purchase-suggestions/:id/items
POST   /purchase-suggestions/:id/approve
POST   /purchase-suggestions/:id/cancel
PATCH  /purchase-suggestions/:id/items/:itemId
POST   /purchase-suggestions/:id/convert-to-order
```

---

## Regras de Aprovação

1. Sugestão gerada pela IA não deve virar Order automaticamente.
2. O comprador deve revisar antes de aprovar.
3. Após aprovada, a sugestão não pode ser alterada livremente.
4. Para editar item sugerido, o usuário deve informar motivo.
5. Ao aprovar, salvar `aprovado_por_id` e `aprovado_em`.
6. Uma sugestão aprovada pode ser convertida em Order.
7. Uma sugestão cancelada não pode virar Order.
8. Uma sugestão com erro não pode ser aprovada.

---

## Regras de Validação da Resposta da IA

1. A resposta precisa ser JSON válido.
2. Todos os itens precisam ter `produto_id`.
3. O `produto_id` precisa existir no payload enviado.
4. O SKU retornado deve bater com o SKU enviado.
5. `quantidade_sugerida` não pode ser negativa.
6. `quantidade_final` não pode ser negativa.
7. `total_pallets` não pode ser negativo.
8. Se `acao_recomendada = COMPRAR`, `quantidade_final` deve ser maior que zero.
9. Se `acao_recomendada = NAO_COMPRAR`, `quantidade_final` deve ser zero.
10. `quantidade_final` deve ser múltiplo de `quantidade_por_pallet`.
11. Se não for múltiplo, backend deve corrigir.
12. Se `media_consumo_diario = 0`, o item deve ser `NAO_COMPRAR` ou `REVISAR`.
13. Se `dias_estoque_disponivel` for maior que `dias_estoque_seguranca`, a IA não deve recomendar compra, salvo se marcar `REVISAR`.
14. Se a IA violar regra crítica, o item deve ser marcado como `validado_backend = false`.

---

## Fallback Determinístico

Se o OpenRouter falhar, expirar ou retornar JSON inválido, o sistema deve conseguir gerar uma sugestão básica usando cálculo local.

Regra de fallback:

```txt
dias_estoque_disponivel = quantidade_estoque / media_consumo_diario

se dias_estoque_disponivel < dias_estoque_seguranca:
    deficit = (media_consumo_diario * dias_estoque_seguranca) - quantidade_estoque
    total_pallets = ceil(deficit / quantidade_por_pallet)
    quantidade_final = total_pallets * quantidade_por_pallet
    acao = COMPRAR
senão:
    quantidade_final = 0
    total_pallets = 0
    acao = NAO_COMPRAR
```

O fallback deve salvar:

```txt
origem = FALLBACK_DETERMINISTICO
status = GERADA_COM_ALERTAS
```

E registrar o erro original da IA.

---

## Auditoria de Decisão

Toda execução deve gerar log em:

```txt
decisao_sistema_log
```

Tipo:

```txt
SUGESTAO_REPOSICAO
```

Critérios mínimos:

```json
{
  "filial_id": "uuid",
  "modelo_ia": "google/gemini-2.5-flash",
  "total_produtos_analisados": 80,
  "criterios": [
    "media_consumo_diario",
    "dias_estoque_seguranca"
  ],
  "usou_fallback": false
}
```

Para cada item crítico, registrar ou vincular os critérios:

```json
{
  "produto_id": "uuid",
  "sku": "56600",
  "estoque_atual": 680,
  "media_consumo_diario": 30.95,
  "dias_estoque_disponivel": 21.97,
  "dias_estoque_seguranca": 30,
  "quantidade_final": 360,
  "total_pallets": 3
}
```

---

## Segurança e Privacidade

1. Não enviar dados desnecessários para a IA.
2. Não enviar dados sensíveis de usuários.
3. Não enviar credenciais.
4. Não enviar informações internas do banco além do necessário.
5. Preferir IDs técnicos e campos operacionais.
6. Salvar payload e resposta para rastreabilidade, se permitido.
7. Permitir desligar a IA por variável de ambiente.
8. Nunca confiar cegamente na resposta da IA.
9. Aplicar timeout.
10. Aplicar limite máximo de produtos por requisição.

---

## Estratégia para muitos produtos

Se a filial tiver muitos produtos, o backend deve limitar ou quebrar em lotes.

Parâmetro:

```txt
AI_PURCHASE_SUGGESTION_MAX_ITEMS=200
```

Se exceder:

1. Filtrar produtos ativos.
2. Priorizar produtos com menor dias de estoque disponível.
3. Enviar em lotes.
4. Consolidar resposta.
5. Salvar uma única sugestão com múltiplos lotes.

---

## Observação sobre branch_product_inventory

Como hoje já existe base real em:

```txt
branch_product_inventory
```

Este slice deve usar essa tabela como fonte principal dos dados de estoque da filial.

Campos esperados ou equivalentes:

```txt
branch_id
product_id
quantity
average_consumption
safety_stock_days
```

Caso os nomes reais sejam diferentes, o serviço de aplicação deve criar uma camada de mapeamento para transformar os dados reais no DTO esperado pela IA.

Exemplo de DTO interno:

```ts
type AiPurchaseSuggestionProductInput = {
  branchId: string
  productId: string
  sku: string
  productName: string
  categoryName: string | null
  stockQuantity: number
  averageDailyConsumption: number
  safetyStockDays: number
  unitsPerPallet: number
}
```

---

## Camadas recomendadas no backend

```txt
purchase-suggestions/
  application/
    generate-purchase-suggestion.use-case.ts
    approve-purchase-suggestion.use-case.ts
    convert-suggestion-to-order.use-case.ts

  domain/
    purchase-suggestion.entity.ts
    purchase-suggestion-item.entity.ts
    purchase-suggestion-rules.ts

  infra/
    openrouter-ai.service.ts
    purchase-suggestion.repository.ts

  http/
    purchase-suggestions.controller.ts
    dto/
      generate-purchase-suggestion.dto.ts
      update-suggestion-item.dto.ts
```

---

## Regras para o Frontend

O frontend deve exibir:

1. Resumo geral da sugestão.
2. Lista de produtos analisados.
3. Itens recomendados para compra.
4. Prioridade.
5. Estoque atual.
6. Média de consumo diário.
7. Dias de estoque disponível.
8. Dias de segurança.
9. Quantidade sugerida.
10. Quantidade final.
11. Total de pallets.
12. Justificativa da IA.
13. Avisos de validação do backend.
14. Botão para aprovar.
15. Botão para cancelar.
16. Botão para editar item com motivo.
17. Botão futuro para gerar Order.

---

## Estados Visuais Recomendados

| Prioridade | Cor sugerida | Uso |
|---|---|---|
| `CRITICA` | Vermelho | Estoque muito abaixo da segurança |
| `ALTA` | Laranja/Vermelho claro | Precisa comprar em breve |
| `MEDIA` | Amarelo | Atenção |
| `BAIXA` | Azul | Compra opcional ou preventiva |
| `SEM_COMPRA` | Verde | Sem necessidade |
| `REVISAR` | Cinza/Roxo | Dados insuficientes ou inconsistentes |

---

## Critérios de Aceite

1. O usuário consegue gerar sugestão de compra para uma filial.
2. O sistema usa dados reais de `branch_product_inventory`.
3. O sistema envia para a IA apenas dados necessários.
4. A IA retorna JSON estruturado.
5. O backend valida a resposta.
6. O backend salva a sugestão.
7. O backend salva os itens da sugestão.
8. O backend corrige arredondamento para pallet quando necessário.
9. O backend registra auditoria da decisão.
10. O frontend consegue listar a sugestão.
11. O comprador consegue aprovar ou cancelar.
12. O sistema possui fallback caso a IA falhe.
13. Nenhuma Order é criada automaticamente sem aprovação.
14. A feature pode ser desligada por variável de ambiente.
15. O modelo de IA pode ser trocado sem alterar regra de negócio.

---

## Fluxo final esperado

```txt
branch_product_inventory
        ↓
GeneratePurchaseSuggestionUseCase
        ↓
normalização dos dados
        ↓
cálculos mínimos do backend
        ↓
OpenRouter / Gemini
        ↓
resposta estruturada
        ↓
validação do backend
        ↓
purchase_suggestion
        ↓
purchase_suggestion_item
        ↓
decisao_sistema_log
        ↓
frontend do comprador
        ↓
aprovação
        ↓
Order de reposição
```

---

## Resumo

Este slice representa o coração do projeto.

Ele conecta os dados reais de estoque com uma camada de IA para gerar recomendações práticas para o comprador, mantendo o backend como fonte de verdade e camada de segurança.

A IA ajuda na sugestão e explicação.

O backend garante consistência, validação, arredondamento, persistência e auditoria.
