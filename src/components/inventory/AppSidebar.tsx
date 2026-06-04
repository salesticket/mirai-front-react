import {
  Bell,
  BarChart3,
  Boxes,
  FileBarChart,
  LayoutDashboard,
  PackageSearch,
  Settings,
  Sparkles,
  Truck,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AiAssistantDrawer } from "./AiAssistantDrawer";

const NAV = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, group: "OPERAÇÃO", href: "/" },
  { id: "supply", label: "Gestão de Abastecimento", icon: Boxes, group: "OPERAÇÃO", href: "/" },
  { id: "risk", label: "Risco de Ruptura", icon: TrendingUp, group: "OPERAÇÃO", href: "/" },
  { id: "suggestion", label: "Sugestão de Compra", icon: Sparkles, group: "OPERAÇÃO", href: "/" },
  { id: "orders", label: "Pedidos", icon: ShoppingCart, group: "CADASTROS", href: "/" },
  { id: "products", label: "Produtos", icon: PackageSearch, group: "CADASTROS", href: "/" },
  { id: "suppliers", label: "Fornecedores", icon: Truck, group: "CADASTROS", href: "/" },
  { id: "reports", label: "Relatórios", icon: FileBarChart, group: "ANÁLISE", href: "/reports" },
  { id: "alerts", label: "Alertas", icon: Bell, group: "ANÁLISE", href: "/" },
  { id: "settings", label: "Configurações", icon: Settings, group: "SISTEMA", href: "/" },
];

export function AppSidebar() {
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();

  const groups = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-dvh">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-foreground text-background flex items-center justify-center">
              <BarChart3 className="size-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight leading-none">LOGISTIX.OS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                Supply Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-5">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest px-3 mb-2 font-semibold">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/reports"
                      ? location.pathname === "/reports"
                      : location.pathname === "/" && item.id === "supply";
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-foreground font-medium border-l-2 border-target"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        <span className="truncate">{item.label}</span>
                        {item.id === "alerts" && (
                          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-critical/20 text-critical">
                            12
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* AI Assistant card */}
        <div className="m-3 p-4 rounded-lg bg-surface-elevated border border-sidebar-border relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-20 rounded-full bg-target/10 blur-2xl" />
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-md bg-target/15 text-target flex items-center justify-center">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-wide">Assistente IA</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-ok font-mono uppercase">
              <span className="size-1.5 rounded-full bg-ok animate-pulse-dot" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Pergunte sobre estoque, metas ou sugestões.
          </p>
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-foreground text-background hover:bg-foreground/90"
            onClick={() => setAiOpen(true)}
          >
            Abrir Assistente
          </Button>
        </div>
      </aside>

      {/* Mobile floating AI trigger */}
      <button
        onClick={() => setAiOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 size-12 rounded-full bg-foreground text-background shadow-elevated flex items-center justify-center"
        aria-label="Abrir assistente IA"
      >
        <Sparkles className="size-5" />
      </button>

      <AiAssistantDrawer open={aiOpen} onOpenChange={setAiOpen} />
    </>
  );
}
