# Slice 2: Produtos e Estoque das Filiais

## Objetivo

Implementar o cadastro de produtos e o controle de estoque por filial, permitindo que o sistema leia o estoque atual, calcule dias disponíveis de estoque e prepare os dados necessários para sugestão de compra.

Este slice é a base do motor de recomendação de abastecimento.

---

## Dependências

Este slice depende dos seguintes slices:

1. **Slice 0: Foundation, Auditoria e Parâmetros Globais**
   - Auditoria.
   - Usuário autenticado.
   - Soft delete.
   - Parâmetros globais.

2. **Slice 1: Cadastros Logísticos Base**
   - Pontos de carregamento.
   - Filiais.

---

## Escopo deste Slice

Este slice deve implementar:

1. Cadastro de produtos.
2. Cadastro de categorias.
3. Unidade de medida.
4. Configuração de pallets por produto.
5. Média de consumo por produto e filial.
6. Estoque atual por produto e filial.
7. Cálculo de dias de estoque disponível.
8. Classificação visual do estoque.
9. Listagem com filtros.
10. Auditoria de alterações de estoque e parâmetros do produto.

---

## Entidades

## Categoria de Produto

```txt
produto_categoria
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---:|---:|---|
| `id` | UUID | Sim | Identificador único |
| `nome` | String | Sim | Nome da categoria |
| `status` | Enum | Sim | ATIVO ou INATIVO |
| `created_at` | DateTime | Sim | Data de criação |
| `updated_at` | DateTime | Sim | Data de atualização |
| `deleted_at` | DateTime | Não | Exclusão lógica |

---

## Produto

```txt
produto
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---:|---:|---|
| `id` | UUID | Sim | Identificador único |
| `sku` | String | Sim | Código SKU |
| `nome` | String | Sim | Nome do produto |
| `categoria_id` | UUID | Não | Categoria |
| `unidade` | String | Sim | Unidade de medida |
| `quantidade_por_pallet` | Decimal | Sim | Quantidade do produto por pallet |
| `peso_unitario_kg` | Decimal | Não | Peso unitário |
| `peso_pallet_kg` | Decimal | Não | Peso aproximado do pallet |
| `ponto_carregamento_id` | UUID | Sim | Ponto de carregamento principal |
| `status` | Enum | Sim | ATIVO ou INATIVO |
| `created_at` | DateTime | Sim | Data de criação |
| `updated_at` | DateTime | Sim | Data de atualização |
| `deleted_at` | DateTime | Não | Exclusão lógica |

---

## Regras de Produto

1. O campo `sku` é obrigatório.
2. O SKU deve ser único entre produtos não deletados.
3. Todo produto deve possuir um ponto de carregamento principal.
4. Produto inativo não deve ser usado em novos pedidos de reposição.
5. Produto deletado não aparece nas listagens padrão.
6. `quantidade_por_pallet` deve ser maior que zero.
7. O sistema deve usar `quantidade_por_pallet` para arredondar sugestão de compra.
8. O peso do produto deve ser usado posteriormente na validação de carga do caminhão.
9. A categoria é opcional, mas recomendada para filtros e agrupamentos.
10. A unidade deve ser padronizada para evitar inconsistências.

---

## Estoque da Filial

```txt
estoque_filial_produto
```

Representa o estoque atual de um produto em uma filial.

| Campo | Tipo | Obrigatório | Descrição |
|---|---:|---:|---|
| `id` | UUID | Sim | Identificador único |
| `filial_id` | UUID | Sim | Filial |
| `produto_id` | UUID | Sim | Produto |
| `quantidade_estoque` | Decimal | Sim | Quantidade atual em estoque |
| `media_consumo_diario` | Decimal | Sim | Média de consumo diário |
| `dias_estoque_seguranca` | Int | Sim | Dias mínimos desejados |
| `dias_estoque_meta` | Int | Não | Meta ideal de estoque |
| `estoque_minimo` | Decimal | Não | Estoque mínimo calculado ou manual |
| `estoque_maximo` | Decimal | Não | Estoque máximo desejado |
| `ultima_atualizacao_estoque` | DateTime | Não | Data da última leitura do estoque |
| `created_at` | DateTime | Sim | Data de criação |
| `updated_at` | DateTime | Sim | Data de atualização |

---

## Regras de Estoque

1. Cada filial deve ter no máximo um registro de estoque por produto.
2. `quantidade_estoque` não pode ser negativa.
3. `media_consumo_diario` deve ser maior ou igual a zero.
4. Se `media_consumo_diario = 0`, o sistema não deve gerar sugestão automática obrigatória.
5. `dias_estoque_disponivel` deve ser calculado como:

```txt
dias_estoque_disponivel = quantidade_estoque / media_consumo_diario
```

6. Se `media_consumo_diario = 0`, retornar `dias_estoque_disponivel = null` ou `INDETERMINADO`.
7. O sistema deve exibir o total equivalente em pallets:

```txt
total_pallets_estoque = quantidade_estoque / quantidade_por_pallet
```

8. Após adicionar ou atualizar estoque, o frontend deve poder exibir um label pequeno com:

```txt
Estoque equivalente: X pallets
```

9. A célula ou valor de `dias_estoque_disponivel` deve mudar de cor conforme a classificação.
10. Toda alteração manual de estoque deve ser auditada.

---

## Classificação do Estoque

Criar enum:

```txt
ClassificacaoEstoque
```

Valores:

```txt
CRITICO
ATENCAO
META
OK
INDETERMINADO
```

---

## Regra de Classificação Recomendada

| Classificação | Condição sugerida | Cor |
|---|---|---|
| `CRITICO` | dias disponíveis menor que dias de segurança | Vermelho |
| `ATENCAO` | dias disponíveis entre segurança e meta mínima | Amarelo |
| `META` | dias disponíveis dentro da faixa ideal | Azul |
| `OK` | dias disponíveis acima da meta | Verde |
| `INDETERMINADO` | média de consumo zero ou sem dados | Cinza |

---

## Observação Importante

Essa classificação deve ser calculada no backend e enviada pronta para o frontend.

O frontend pode controlar a apresentação visual, mas não deve ser responsável por decidir se um produto está crítico, em atenção, meta ou ok.

---

## Endpoints sugeridos

```txt
GET    /produtos
POST   /produtos
GET    /produtos/:id
PATCH  /produtos/:id
DELETE /produtos/:id

GET    /categorias-produto
POST   /categorias-produto
PATCH  /categorias-produto/:id
DELETE /categorias-produto/:id

GET    /estoques
POST   /estoques
PATCH  /estoques/:id
GET    /estoques/filial/:filialId
GET    /estoques/produto/:produtoId
```

---

## Filtros recomendados

Para produtos:

```txt
sku
nome
categoria_id
ponto_carregamento_id
status
```

Para estoque:

```txt
filial_id
produto_id
categoria_id
classificacao
dias_estoque_min
dias_estoque_max
somente_criticos
somente_com_sugestao
```

---

## Fora do Escopo

Não implementar ainda:

- criação de pedidos de reposição;
- envio de demanda para ponto de carregamento;
- geração de pallets;
- montagem de carga;
- seleção de caminhão;
- seleção de motorista;
- geração de viagem.
