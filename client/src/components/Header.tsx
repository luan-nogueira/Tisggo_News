import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ThemeToggle } from "./ThemeToggle";
import { Badge } from "./ui/badge";

import { WeatherWidget } from "./WeatherWidget";
import { ArrowLeft } from "lucide-react";
import { getCategoryEmoji } from "@/lib/utils";

interface HeaderProps {
  categories?: any[];
  currentCategoryId?: string;
  onOpenAdvertise?: () => void;
  showWeather?: boolean;
  showBack?: boolean;
}

export function Header({ categories, currentCategoryId, onOpenAdvertise, showWeather, showBack }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, navigate] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: suggestions, isLoading: suggestionsLoading } = trpc.articles.suggestions.useQuery(
    searchQuery,
    { enabled: searchQuery.length >= 2 }
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search/${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  };



  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-12 shrink-0">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 text-foreground hover:text-accent transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                <img 
                  src="/brand-icon.png" 
                  alt="Tisgo Icon" 
                  className="w-full h-full object-contain rounded-full border-2 border-accent/20"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black leading-none tracking-tighter italic flex items-center">
                  <span className="text-accent drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">TISGO</span>
                  <span className="text-foreground drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">NEWS</span>
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-[1px] w-3 bg-accent/30" />
                  <span className="text-[7px] sm:text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
                    Campos dos Goytacazes
                  </span>
                  <div className="h-[1px] w-3 bg-accent/30" />
                </div>
              </div>
            </Link>
          </div>

          <nav className="hidden xl:flex items-center gap-4">
            {categories?.slice(0, 8).map((cat) => (
              <Link 
                key={cat.id} 
                href={`/category/${cat.slug}`} 
                className={`text-sm font-bold uppercase transition-colors ${String(cat.id) === String(currentCategoryId) ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {showWeather && (
              <div className="hidden md:block">
                <WeatherWidget />
              </div>
            )}

            <div className="relative hidden sm:block" ref={searchRef}>
              <form onSubmit={handleSearch} className="flex items-center bg-muted border border-border rounded overflow-hidden">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none px-3 py-2 text-sm w-32 md:w-48 text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                <button type="submit" className="px-3 py-2 bg-accent text-black hover:bg-yellow-500 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>

              <AnimatePresence>
                {showSuggestions && (searchQuery.length >= 2) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-72 md:w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[60]"
                  >
                    {suggestionsLoading ? (
                      <div className="p-4 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      </div>
                    ) : suggestions && suggestions.length > 0 ? (
                      <div className="divide-y divide-border">
                        {suggestions.map((s: any) => (
                          <Link 
                            key={s.id} 
                            href={`/article/${s.slug}`}
                            onClick={() => setShowSuggestions(false)}
                            className="flex flex-col p-3 hover:bg-muted transition-colors"
                          >
                            <span className="text-sm font-bold text-foreground line-clamp-1">{s.title}</span>
                            <span className="text-[10px] text-accent font-black uppercase mt-1">Ler Notícia</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum resultado encontrado
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />
            <button 
              onClick={onOpenAdvertise}
              className="hidden sm:block px-3 py-1.5 bg-accent text-black text-xs font-black hover:bg-yellow-500 transition-colors"
            >
              ANUNCIE
            </button>
            {showBack && (
              <Link href="/" className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Category Scroll Bar */}
      <div className="xl:hidden border-b border-border bg-card/50 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-8 px-6 py-4 whitespace-nowrap">
          {categories?.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/category/${cat.slug}`} 
              className={`text-[11px] font-black uppercase transition-colors inline-flex items-center shrink-0 ${String(cat.id) === String(currentCategoryId) ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
            >
              <span className="text-sm shrink-0 mr-1.5">{getCategoryEmoji(cat.name)}</span>
              <span className="whitespace-nowrap tracking-wider">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm xl:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-[70] p-6 xl:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-xl font-black">MENU</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">Categorias</h4>
                  <div className="grid gap-2">
                    {categories?.map((cat) => (
                      <Link 
                        key={cat.id} 
                        href={`/category/${cat.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors text-sm font-bold uppercase ${String(cat.id) === String(currentCategoryId) ? 'bg-accent/10 text-accent' : 'hover:bg-muted'}`}
                      >
                        <span className="text-xl">{getCategoryEmoji(cat.name)}</span>
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
