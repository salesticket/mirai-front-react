import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Package2,
  Sparkles
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { ProductStatusBadge } from './ProductStatusBadge'
import { SuggestionQuantityInput } from './SuggestionQuantityInput'
import { PRIORITY_RANK } from '@/lib/inventory-calc'
import {
  calculatePalletCount,
  formatPalletCount,
  formatQuantity,
  getLoadingPointLabel
} from '@/lib/pallets'
import type { ComputedRow, Confidence, Product } from '@/types/inventory'

interface Props {
  rows: ComputedRow[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onChangeQty: (id: string, qty: number) => void
  onOpenDetails: (row: ComputedRow) => void
  generated: boolean
}

type SortKey = 'priority' | 'stockDays' | 'currentStock' | 'suggestion' | 'name'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
}
const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: 'text-ok',
  medium: 'text-attention',
  low: 'text-muted-foreground'
}

const ROW_TINT: Record<string, string> = {
  critical: 'row-critical hover:bg-critical/10',
  attention: 'row-attention hover:bg-attention/[0.07]',
  target: 'row-target hover:bg-target/[0.06]',
  ok: 'hover:bg-accent/40'
}

const PAGE_SIZE = 8
const requiresFullPallet = (product: Product) =>
  product.loadingPoint?.type === 'SIMPLE'

export function ProductSuggestionTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onChangeQty,
  onOpenDetails,
  generated
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'priority':
          return (
            (PRIORITY_RANK[a.suggestion.priority] -
              PRIORITY_RANK[b.suggestion.priority]) *
            dir
          )
        case 'stockDays':
          return (a.suggestion.stockDays - b.suggestion.stockDays) * dir
        case 'currentStock':
          return (a.product.currentStock - b.product.currentStock) * dir
        case 'suggestion':
          return (
            (a.suggestion.editedSuggestion - b.suggestion.editedSuggestion) *
            dir
          )
        case 'name':
          return a.product.name.localeCompare(b.product.name) * dir
      }
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const selectablePageRows = pageRows.filter(
    (r) => r.suggestion.editedSuggestion > 0
  )

  const allSelectedOnPage =
    selectablePageRows.length > 0 &&
    selectablePageRows.every((r) => selected.has(r.product.id))

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? (
        <ChevronUp className="size-3" />
      ) : (
        <ChevronDown className="size-3" />
      )
    ) : null

  if (!generated) {
    return (
      <div className="bg-surface-1 border border-border border-dashed rounded-lg p-12 text-center">
        <div className="size-12 mx-auto rounded-md bg-accent flex items-center justify-center mb-4">
          <Sparkles className="size-6 text-target" />
        </div>
        <h3 className="text-base font-semibold">
          Nenhuma sugestão gerada ainda
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Clique em "Gerar Sugestão de Compra" para calcular recomendações com
          base em giro, segurança e múltiplos logísticos.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground bg-surface-2 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="py-3 px-3 w-10">
                  <Checkbox
                    checked={allSelectedOnPage}
                    disabled={selectablePageRows.length === 0}
                    onCheckedChange={onToggleAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="py-3 px-3 text-left font-medium">
                  <button
                    onClick={() => setSort('name')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Produto <SortIcon k="name" />
                  </button>
                </th>
                <th className="py-3 px-3 text-left font-medium">Categoria</th>
                <th className="py-3 px-3 text-center font-medium">
                  <button
                    onClick={() => setSort('currentStock')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Estoque <SortIcon k="currentStock" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center font-medium">
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1 hover:text-foreground">
                      Giro 30/15/1D <Info className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Média de venda nos últimos 30, 15 e 1 dia.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="py-3 px-3 text-center font-medium">
                  <button
                    onClick={() => setSort('stockDays')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">
                        Dias <Info className="size-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Estoque atual ÷ giro médio ponderado.
                      </TooltipContent>
                    </Tooltip>
                    <SortIcon k="stockDays" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center font-medium">Meta</th>
                <th className="py-3 px-3 text-center font-medium">
                  <button
                    onClick={() => setSort('priority')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Status <SortIcon k="priority" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center font-medium">
                  <button
                    onClick={() => setSort('suggestion')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Sugestão <SortIcon k="suggestion" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ product, suggestion }) => {
                const isSel = selected.has(product.id)
                const canSelect = suggestion.editedSuggestion > 0

                const estimatedPallets = calculatePalletCount(
                  suggestion.editedSuggestion,
                  product.unitsPerPallet
                )

                const targetPct = Math.min(
                  100,
                  (product.currentStock / product.categoryTarget) * 100
                )
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'border-b border-border/60 transition-colors',
                      ROW_TINT[suggestion.priority],
                      isSel && 'bg-target/[0.06]'
                    )}
                  >
                    <td className="py-3 px-3">
                      <Checkbox
                        checked={isSel}
                        disabled={!canSelect}
                        onCheckedChange={() => onToggle(product.id)}
                        aria-label={
                          canSelect
                            ? `Selecionar ${product.sku}`
                            : `${product.sku} sem quantidade para pedido`
                        }
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded bg-accent border border-border flex items-center justify-center shrink-0">
                          <Package2 className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {product.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {product.sku} · {product.branchName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {getLoadingPointLabel(product.loadingPoint)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-muted-foreground">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div
                        className={cn(
                          'font-mono tabular-nums text-sm',
                          product.currentStock < product.safetyStock &&
                            'text-critical font-semibold'
                        )}
                      >
                        {formatQuantity(product.currentStock)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        seg. {formatQuantity(product.safetyStock)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-mono text-[11px] tabular-nums leading-tight">
                        <div>
                          30D{' '}
                          <span className="text-foreground">
                            {formatQuantity(product.average30d)}
                          </span>
                        </div>
                        <div>
                          15D{' '}
                          <span className="text-foreground">
                            {formatQuantity(product.average15d)}
                          </span>
                        </div>
                        <div>
                          1D{' '}
                          <span className="text-foreground">
                            {formatQuantity(product.average1d)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div
                        className={cn(
                          'font-mono tabular-nums text-sm',
                          suggestion.stockDays < 3 &&
                            'text-critical font-semibold',
                          suggestion.stockDays >= 3 &&
                            suggestion.stockDays < 7 &&
                            'text-attention'
                        )}
                      >
                        {isFinite(suggestion.stockDays)
                          ? `${suggestion.stockDays.toFixed(1)}d`
                          : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-accent rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              targetPct < 40 && 'bg-critical',
                              targetPct >= 40 &&
                                targetPct < 80 &&
                                'bg-attention',
                              targetPct >= 80 && 'bg-ok'
                            )}
                            style={{ width: `${targetPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-8 text-right">
                          {targetPct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ProductStatusBadge priority={suggestion.priority} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-center gap-1">
                        <SuggestionQuantityInput
                          value={suggestion.editedSuggestion}
                          step={product.unitsPerPallet}
                          onChange={(q) => onChangeQty(product.id, q)}
                          requireFullPallet={requiresFullPallet(product)}
                        />
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span
                              className={
                                CONFIDENCE_STYLE[suggestion.confidence]
                              }
                            >
                              ● {CONFIDENCE_LABEL[suggestion.confidence]}
                            </span>

                            {!canSelect && (
                              <span className="text-attention">
                                Sem quantidade
                              </span>
                            )}

                            {suggestion.supplierShort && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="size-3 text-critical" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Estoque do fornecedor insuficiente (
                                  {product.availableSupplierStock} un).
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {estimatedPallets > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Package2 className="size-3" />
                              <span>
                                {formatPalletCount(estimatedPallets)} pallets
                              </span>
                            </div>
                          )}

                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 hover:bg-accent"
                        onClick={() => onOpenDetails({ product, suggestion })}
                        aria-label="Ver detalhes"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {pageRows.map(({ product, suggestion }) => {
            const isSel = selected.has(product.id)
            const canSelect = suggestion.editedSuggestion > 0
            return (
              <div
                key={product.id}
                className={cn(
                  'p-4 space-y-3',
                  ROW_TINT[suggestion.priority],
                  isSel && 'bg-target/[0.06]'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSel}
                    disabled={!canSelect}
                    onCheckedChange={() => onToggle(product.id)}
                    className="mt-1"
                    aria-label={
                      canSelect
                        ? `Selecionar ${product.sku}`
                        : `${product.sku} sem quantidade para pedido`
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      <ProductStatusBadge priority={suggestion.priority} />
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {product.sku} · {product.branchName}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {getLoadingPointLabel(product.loadingPoint)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Estoque
                    </div>
                    <div className="font-mono font-semibold tabular-nums">
                      {formatQuantity(product.currentStock)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Dias
                    </div>
                    <div
                      className={cn(
                        'font-mono font-semibold tabular-nums',
                        suggestion.stockDays < 3 && 'text-critical'
                      )}
                    >
                      {isFinite(suggestion.stockDays)
                        ? `${suggestion.stockDays.toFixed(1)}d`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Giro
                    </div>
                    <div className="font-mono font-semibold tabular-nums">
                      {formatQuantity(suggestion.averageTurnover)}/d
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <SuggestionQuantityInput
                    value={suggestion.editedSuggestion}
                    step={product.unitsPerPallet}
                    onChange={(q) => onChangeQty(product.id, q)}
                    requireFullPallet={requiresFullPallet(product)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDetails({ product, suggestion })}
                  >
                    <Eye className="size-4" />
                    Detalhes
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2 text-xs">
          <div className="text-muted-foreground font-mono">
            {sorted.length === 0
              ? '0 produtos'
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sorted.length)} de ${sorted.length}`}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
