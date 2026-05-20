import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { Priority } from '@/types/inventory'

export interface FiltersState {
  branchId: string
  category: string
  priority: Priority | 'all'
  query: string
}

interface Props {
  branches: { id: string; name: string }[]
  categories: string[]
  value: FiltersState
  onChange: (next: FiltersState) => void
}

export function FiltersBar({ branches, categories, value, onChange }: Props) {
  const set = (patch: Partial<FiltersState>) => onChange({ ...value, ...patch })

  const clear = () =>
    onChange({ branchId: 'all', category: 'all', priority: 'all', query: '' })

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-3 flex flex-col lg:flex-row lg:items-center gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Search className="size-4 text-muted-foreground shrink-0 ml-1" />
        <Input
          value={value.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Buscar produto, SKU ou código…"
          className="border-0 bg-transparent focus-visible:ring-0 px-0 placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-2 lg:flex gap-2">
        <Select
          value={value.branchId}
          onValueChange={(v) => set({ branchId: v })}
        >
          <SelectTrigger className="lg:w-44 bg-surface-2 border-border">
            <SelectValue placeholder="Filial" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as filiais</SelectItem>
            {branches.map((b) => (
              <SelectItem
                key={b.id}
                value={b.id}
              >
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.category}
          onValueChange={(v) => set({ category: v })}
        >
          <SelectTrigger className="lg:w-44 bg-surface-2 border-border">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem
                key={c}
                value={c}
              >
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.priority}
          onValueChange={(v) => set({ priority: v as Priority | 'all' })}
        >
          <SelectTrigger className="lg:w-40 bg-surface-2 border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="attention">Atenção</SelectItem>
            <SelectItem value="target">Meta</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="border-border bg-surface-2 hover:bg-accent"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden md:inline">Mais filtros</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="hidden md:inline">Limpar</span>
        </Button>
      </div>
    </div>
  )
}
