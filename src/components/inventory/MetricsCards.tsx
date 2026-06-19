/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { AlertOctagon, AlertTriangle, Boxes, CheckCircle2, Layers, PackageCheck, Target, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPalletCount } from "@/lib/pallets";

interface Metric {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  tone: "critical" | "attention" | "target" | "ok" | "neutral";
}

interface Props {
  criticalCount: number;
  attentionCount: number;
  targetCount: number;
  okCount: number;
  totalUnits: number;
  totalPallets: number;
  estimatedValue: number;
  fillRate: number;
}

const TONE_STYLES: Record<Metric["tone"], { border: string; icon: string; ring: string; gradient: string }> = {
  critical: {
    border: "border-l-critical",
    icon: "text-critical bg-critical/15",
    ring: "shadow-glow-critical",
    gradient: "from-critical/8",
  },
  attention: {
    border: "border-l-attention",
    icon: "text-attention bg-attention/15",
    ring: "",
    gradient: "from-attention/8",
  },
  target: {
    border: "border-l-target",
    icon: "text-target bg-target/15",
    ring: "",
    gradient: "from-target/8",
  },
  ok: {
    border: "border-l-ok",
    icon: "text-ok bg-ok/15",
    ring: "",
    gradient: "from-ok/8",
  },
  neutral: {
    border: "border-l-border",
    icon: "text-foreground bg-accent",
    ring: "",
    gradient: "from-accent/30",
  },
};

function Card({ m, highlight }: { m: Metric; highlight?: boolean }) {
  const Icon = m.icon;
  const styles = TONE_STYLES[m.tone];
  return (
    <div
      className={cn(
        "relative bg-surface-1 border border-border border-l-2 rounded-lg p-4 transition-all hover:border-l-4",
        styles.border,
        highlight && styles.ring,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-lg bg-gradient-to-br opacity-50 pointer-events-none",
          styles.gradient,
          "to-transparent",
        )}
      />
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{m.label}</span>
        <div className={cn("size-7 rounded-md flex items-center justify-center", styles.icon)}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="relative">
        <div className="text-2xl font-mono font-semibold tabular-nums tracking-tight">{m.value}</div>
        <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{m.subtitle}</div>
      </div>
    </div>
  );
}

export function MetricsCards({
  criticalCount,
  attentionCount,
  targetCount,
  okCount,
  totalUnits,
  totalPallets,
  estimatedValue,
  fillRate,
}: Props) {
  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat("pt-BR");

  const items: Metric[] = [
    {
      label: "Crítico",
      value: criticalCount,
      subtitle: "Em ruptura ou abaixo da segurança",
      icon: AlertOctagon,
      tone: "critical",
    },
    {
      label: "Atenção",
      value: attentionCount,
      subtitle: "Próximos do limite de cobertura",
      icon: AlertTriangle,
      tone: "attention",
    },
    {
      label: "Meta",
      value: targetCount,
      subtitle: "Abaixo da meta de categoria",
      icon: Target,
      tone: "target",
    },
    {
      label: "OK",
      value: okCount,
      subtitle: "Estoque saudável",
      icon: CheckCircle2,
      tone: "ok",
    },
    {
      label: "Sugestão Total",
      value: fmtNum.format(totalUnits),
      subtitle: "Unidades sugeridas",
      icon: Boxes,
      tone: "neutral",
    },
    {
      label: "Pallets Estimados",
      value: formatPalletCount(totalPallets),
      subtitle: "Com base em múltiplos logísticos",
      icon: Layers,
      tone: "neutral",
    },
    {
      label: "Valor Estimado",
      value: fmtBRL.format(estimatedValue),
      subtitle: "Total do pedido sugerido",
      icon: Wallet,
      tone: "neutral",
    },
    {
      label: "Nível Geral",
      value: `${fillRate.toFixed(0)}%`,
      subtitle: "Aderência ao abastecimento ideal",
      icon: PackageCheck,
      tone: fillRate > 80 ? "ok" : fillRate > 60 ? "target" : fillRate > 40 ? "attention" : "critical",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
      {items.map((m, i) => (
        <Card key={m.label} m={m} highlight={i === 0 && criticalCount > 0} />
      ))}
    </div>
  );
}
