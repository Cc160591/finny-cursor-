"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Send, User, Loader2 } from "lucide-react";
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
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insightCount, setInsightCount] = useState(2); // Mock count
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Verifica sessione e carica storico (mock per ora o reale se implementato)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    };
    checkAuth();
    
    // Inizializza con messaggi di benvenuto se vuoto
    setMessages([
      { id: "1", role: "assistant", content: "Hey Cleo, come vanno le finanze oggi?" },
      { id: "2", role: "assistant", content: "Spero tu non abbia comprato l'ennesima pizza a mezzanotte..." }
    ]);
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsgText = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMsgText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

// #region agent log
const logStart = {location:'app/page.tsx:67',message:'Fetch Start',data:{url:'/api/chat'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'3'};
console.log('DEBUG:', logStart);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logStart)}).catch(()=>{});
// #endregion
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: userMsgText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
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

      // Estrai prima transazione se presente
      const transAction = result.actions?.find((a: any) => a.type === "create_transaction");
      if (transAction) {
        assistantMessage.transaction = {
          amount_cents: transAction.data.amount_cents,
          merchant: transAction.data.merchant
        };
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
            onClick={handleSend}
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
