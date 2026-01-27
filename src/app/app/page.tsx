"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Send, User, Loader2, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  transaction?: {
    amount_cents: number;
    merchant: string;
  };
  selection?: {
    question: string;
    options: { id: string; name: string }[];
    pending_transaction: any;
  };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insightCount, setInsightCount] = useState(0); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Verifica sessione e carica storico dal DB
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Carica storico reale
      const { data: history } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (history && history.length > 0) {
        setMessages(history.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content
        })));
      } else {
        // Welcome generico se vuoto
        setMessages([
          { id: "welcome", role: "assistant", content: "Ciao! Sono Finny, il tuo coach finanziario. Come posso aiutarti oggi?" }
        ]);
      }
    };
    
    initChat();
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customPayload?: any) => {
    if ((!input.trim() && !customPayload) || loading) return;

    const userMsgText = customPayload ? `Selezionato conto: ${customPayload.account_name}` : input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMsgText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(customPayload || {
          message: userMsgText
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Errore API");
      }

      const result = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.assistant_message,
      };

      // Gestione azioni
      if (result.actions) {
        // 1. Transazione creata
        const transAction = result.actions.find((a: any) => a.type === "transaction_created");
        if (transAction) {
          assistantMessage.transaction = {
            amount_cents: transAction.data.amount_cents,
            merchant: transAction.data.merchant
          };
        }

        // 2. Richiesta selezione conto
        const selectionAction = result.actions.find((a: any) => a.type === "needs_account_selection");
        if (selectionAction) {
          assistantMessage.selection = {
            question: selectionAction.data.question,
            options: selectionAction.data.options,
            pending_transaction: selectionAction.data.pending_transaction
          };
        }
      }

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [...prev, {
        id: "err",
        role: "assistant",
        content: `Scusa, ho avuto un problema: ${err.message}. Riprova tra un attimo?`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (option: { id: string; name: string }, pendingTransaction: any) => {
    handleSend({
      selected_account_id: option.id,
      account_name: option.name,
      pending_transaction: pendingTransaction
    });
  };

  return (
    <main className="flex flex-col h-screen bg-finny-gradient max-w-md mx-auto shadow-2xl relative overflow-hidden font-sans">
      {/* Header */}
      <header className="flex justify-end items-center p-4 pt-8 shrink-0">
        <div className="flex items-center space-x-4">
          <button className="relative p-2 bg-white/50 rounded-full hover:bg-white/70 transition-colors">
            <Bell className="w-6 h-6 text-finny-accent" />
            {insightCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#F5F0E1]">
                {insightCount}
              </span>
            )}
          </button>
          <div className="p-1 border-2 border-finny-accent rounded-full bg-white/30">
            <User className="w-8 h-8 text-finny-accent" />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <section className="flex-1 overflow-y-auto px-4 space-y-8 pb-32 pt-4 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] ${msg.role === "assistant" ? "space-y-3" : ""}`}>
              <div
                className={`p-4 rounded-[2rem] text-[1.1rem] leading-tight ${
                  msg.role === "user"
                    ? "bg-white text-finny-dark shadow-md rounded-tr-none"
                    : "text-finny-dark font-medium"
                }`}
              >
                {msg.content.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>

              {msg.transaction && (
                <div className="inline-flex items-center space-x-2 bg-white/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/40 ml-1 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-finny-dark/80">
                    Aggiunto: €{(msg.transaction.amount_cents / 100).toFixed(2)} · {msg.transaction.merchant}
                  </span>
                </div>
              )}

              {msg.selection && (
                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                  {msg.selection.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelectAccount(option, msg.selection?.pending_transaction)}
                      className="bg-finny-accent text-white text-sm font-bold px-4 py-2 rounded-full shadow-md hover:bg-finny-accent/90 transition-all flex items-center space-x-1"
                    >
                      <span>{option.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-4">
              <Loader2 className="w-6 h-6 text-finny-accent animate-spin opacity-50" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Composer (WhatsApp style) */}
      <footer className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-finny-green via-finny-green/80 to-transparent">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Chiedimi qualsiasi cosa..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
            className="flex-1 bg-white border-none rounded-full px-7 py-4 shadow-xl text-lg focus:outline-none focus:ring-2 focus:ring-finny-accent/30 placeholder:text-gray-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-finny-accent text-white p-4 rounded-full shadow-2xl disabled:opacity-50 active:scale-90 transition-all transform"
          >
            <Send className="w-7 h-7" />
          </button>
        </div>
      </footer>
    </main>
  );
}
