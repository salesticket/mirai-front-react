/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

import { Sparkles, Send } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED = [
  "Por que este produto foi classificado como crítico?",
  "Quais produtos devo priorizar hoje?",
  "Explique a sugestão de compra do Item.",
  "Por que a sugestão foi arredondada?",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const INITIAL: Msg[] = [
  {
    role: "assistant",
    content:
      "Olá! Sou o assistente de abastecimento. Posso explicar o cálculo de cada sugestão, identificar riscos de ruptura e ajudar a priorizar pedidos. Pergunte sobre qualquer item.",
  },
];

export function AiAssistantDrawer({ open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    const reply: Msg = {
      role: "assistant",
      content:
        "Com base nos dados do produto: o estoque atual está abaixo do ponto de segurança e a cobertura é menor que o desejado. A sugestão foi calculada como giro × dias de cobertura + segurança − estoque atual e arredondada ao múltiplo de pallet.",
    };
    setMessages((m) => [...m, { role: "user", content: text }, reply]);
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-surface-1 border-border p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="size-7 rounded-md bg-target/15 text-target flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            Assistente IA
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-ok uppercase">
              <span className="size-1.5 rounded-full bg-ok animate-pulse-dot" />
              Online
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "assistant"
                  ? "bg-surface-2 border border-border rounded-lg p-3 text-sm leading-relaxed"
                  : "bg-target/10 border border-target/30 rounded-lg p-3 text-sm leading-relaxed ml-6"
              }
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-mono">
                {m.role === "assistant" ? "IA" : "Você"}
              </div>
              {m.content}
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="pt-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
                Sugestões
              </div>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="border-t border-border p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre estoque, riscos ou sugestões…"
            className="bg-surface-2 border-border"
          />
          <Button type="submit" size="icon" className="bg-foreground text-background hover:bg-foreground/90">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
