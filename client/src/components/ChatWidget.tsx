import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Assistente IA do Tisgo News. Como posso te ajudar hoje?"
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const askMutation = trpc.ai.ask.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || askMutation.isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Captura o histórico atual antes de adicionar a nova mensagem do usuário
    const history = messages
      .filter((_, idx) => idx > 0) // ignora o cumprimento fixo inicial
      .slice(-6); // envia as últimas 6 interações para o contexto

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await askMutation.mutateAsync({ 
        question: userMessage,
        history: history as any
      });
      setMessages(prev => [...prev, { role: "assistant", content: response.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Desculpe, tive um probleminha técnico. Pode tentar perguntar novamente?" 
      }]);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[90]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-accent p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-black font-black uppercase text-sm tracking-widest">Assistente Tisgo</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    <span className="text-[10px] text-black/60 font-bold uppercase">Online agora</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-black/60 hover:text-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-accent" : "bg-muted"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-black" /> : <Bot className="w-4 h-4 text-accent" />}
                    </div>
                    <div className={`
                      p-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user" 
                        ? "bg-accent text-black font-medium rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border border-white/5"}
                    `}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {askMutation.isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center bg-muted p-3 rounded-2xl rounded-tl-none border border-white/5">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span className="text-xs text-muted-foreground font-medium italic">Tisgo está pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-card">
              <form 
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <input 
                  type="text"
                  placeholder="Pergunte qualquer coisa..."
                  className="flex-1 bg-muted border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button 
                  type="submit"
                  size="icon"
                  className="bg-accent hover:bg-yellow-500 text-black rounded-xl"
                  disabled={askMutation.isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[9px] text-muted-foreground text-center mt-2 uppercase tracking-widest font-bold opacity-50">
                Powered by Tisgo AI Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-12 h-12 bg-accent rounded-full shadow-2xl hover:shadow-accent/40 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20 group-hover:opacity-40" />
        {isOpen ? (
          <X className="w-5 h-5 text-black relative z-10" />
        ) : (
          <Sparkles className="w-5 h-5 text-black relative z-10" />
        )}
      </motion.button>
      </div>
    </>
  );
}
