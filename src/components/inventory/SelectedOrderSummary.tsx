import { ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPalletCount, formatQuantity } from "@/lib/pallets";

interface Props {
  count: number;
  totalUnits: number;
  totalPallets: number;
  simplePallets: number;
  mixedPallets: number;
  unclassifiedPallets: number;
  estimatedValue: number;
  onClear: () => void;
  onGenerate: () => void;
}

export function SelectedOrderSummary({
  count,
  totalUnits,
  totalPallets,
  simplePallets,
  mixedPallets,
  unclassifiedPallets,
  estimatedValue,
  onClear,
  onGenerate,
}: Props) {
  if (count === 0) return null;

  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 animate-slide-up">
      <div className="bg-surface-elevated border-t border-l border-target/30 shadow-elevated px-4 py-3 lg:rounded-tl-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-md bg-target/15 text-target flex items-center justify-center">
              <ShoppingCart className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Selecionados</div>
              <div className="text-sm font-semibold tabular-nums">{count} produtos</div>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-border" />

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Unidades</div>
            <div className="text-sm font-mono font-semibold tabular-nums">{formatQuantity(totalUnits)}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Pallets</div>
            <div className="text-sm font-mono font-semibold tabular-nums">{formatPalletCount(totalPallets)}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Cheio</div>
            <div className="text-sm font-mono font-semibold tabular-nums">{formatPalletCount(simplePallets)}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Misto</div>
            <div className="text-sm font-mono font-semibold tabular-nums">{formatPalletCount(mixedPallets)}</div>
          </div>

          {unclassifiedPallets > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Sem ponto</div>
              <div className="text-sm font-mono font-semibold tabular-nums">
                {formatPalletCount(unclassifiedPallets)}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Valor estimado</div>
            <div className="text-sm font-mono font-semibold tabular-nums text-target">
              {fmtBRL.format(estimatedValue)}
            </div>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="size-4" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
            <Button
              size="sm"
              onClick={onGenerate}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              Gerar Pedido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
