/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { useState } from "react";
import { Sparkles, RefreshCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  generated: boolean;
  loading: boolean;
  branches: { id: string; name: string }[];
  selectedBranchId: string;
  onSelectedBranchChange: (branchId: string) => void;
  onGenerate: (branchId: string) => Promise<boolean | void> | boolean | void;
  onRecalculate: (branchId: string) => Promise<boolean | void> | boolean | void;
  totalSuggested: number;
  totalProducts: number;
}

export function GenerateSuggestionButton({
  generated,
  loading,
  branches,
  selectedBranchId,
  onSelectedBranchChange,
  onGenerate,
  onRecalculate,
  totalSuggested,
  totalProducts,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitAction, setSubmitAction] = useState<"generate" | "recalculate">("generate");
  const [branchError, setBranchError] = useState("");

  const openGenerationModal = (action: "generate" | "recalculate") => {
    setSubmitAction(action);
    setBranchError("");
    setOpen(true);
  };

  const submit = async () => {
    if (!selectedBranchId) {
      setBranchError("Selecione uma filial para gerar a sugestão.");
      return;
    }

    if (!branches.some((branch) => branch.id === selectedBranchId)) {
      setBranchError("A filial selecionada não está disponível.");
      return;
    }

    const success =
      submitAction === "recalculate"
        ? await onRecalculate(selectedBranchId)
        : await onGenerate(selectedBranchId);

    if (success !== false) setOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border bg-surface-1 p-4 md:p-5",
          generated ? "border-target/40" : "border-border",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 pointer-events-none opacity-60",
            "bg-[radial-gradient(circle_at_top_left,hsl(var(--target)/0.18),transparent_60%)]",
          )}
        />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="size-10 rounded-md bg-target/15 text-target flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">Motor de Sugestão de Compra</h3>
              {generated && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-ok px-2 py-0.5 rounded bg-ok/10 border border-ok/30">
                  <CheckCircle2 className="size-3" />
                  Gerada
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {generated
                ? `Recomendação gerada para ${totalProducts} produtos · ${totalSuggested.toLocaleString("pt-BR")} unidades sugeridas com base em giro de estoque, segurança e múltiplos logísticos.`
                : "Calcule sugestões determinísticas usando giro médio ponderado, estoque de segurança, dias de cobertura e arredondamento por pallet."}
            </p>
          </div>

          <div className="flex gap-2">
            {generated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openGenerationModal("recalculate")}
                disabled={loading}
                className="border-border"
              >
                <RefreshCcw className="size-4" />
                Recalcular
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => openGenerationModal("generate")}
              disabled={loading}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-elevated"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {generated ? "Gerar novamente" : "Gerar Sugestão de Compra"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{generated ? "Gerar sugestão novamente" : "Gerar sugestão de compra"}</DialogTitle>
            <DialogDescription>Selecione a filial que será usada como parâmetro para a geração.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="generation-branch">Filial</Label>
            <Select
              value={selectedBranchId}
              onValueChange={(value) => {
                onSelectedBranchChange(value);
                setBranchError("");
              }}
              disabled={loading || branches.length === 0}
            >
              <SelectTrigger id="generation-branch" className="bg-surface-2 border-border">
                <SelectValue placeholder={branches.length > 0 ? "Selecione uma filial" : "Nenhuma filial disponível"} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {branchError && <p className="text-xs text-destructive">{branchError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={loading || branches.length === 0}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-elevated"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Gerar sugestão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
