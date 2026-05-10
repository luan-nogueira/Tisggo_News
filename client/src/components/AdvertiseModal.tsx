import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface AdvertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvertiseModal({ isOpen, onClose }: AdvertiseModalProps) {
  const [copied, setCopied] = useState(false);
  const email = "Contato@tisgo.com.br";

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-card border border-border w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-accent" />
              </div>

              <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tighter">
                Anuncie no <span className="text-accent">Tisggo</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Alcance milhares de leitores em Campos e região. Entre em contato para conhecer nossos planos e formatos.
              </p>

              <div className="w-full bg-muted p-4 rounded-xl border border-border flex items-center justify-between mb-6 group hover:border-accent transition-colors">
                <span className="font-bold text-foreground text-sm truncate">{email}</span>
                <button 
                  onClick={copyEmail}
                  className="p-2 hover:bg-background rounded-lg transition-colors relative"
                  title="Copiar e-mail"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
                  )}
                </button>
              </div>

              <Button 
                onClick={() => window.location.href = `mailto:${email}`}
                className="w-full bg-accent text-black font-black py-6 rounded-xl hover:bg-yellow-500 transition-all hover:scale-[1.02] active:scale-95"
              >
                ENVIAR E-MAIL AGORA
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
