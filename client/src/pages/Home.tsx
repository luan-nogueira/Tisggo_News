import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronRight, Eye, LogIn, Menu, X, Zap, Instagram, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AdvertiseModal } from "@/components/AdvertiseModal";

const getCategoryEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('esporte')) return '⚽';
  if (n.includes('polícia')) return '🚨';
  if (n.includes('cidade')) return '🏙️';
  if (n.includes('economia')) return '📈';
  if (n.includes('geral')) return '📰';
  return '🗞️';
};

const renderMedia = (url: string, alt: string, className: string) => {
  const isVideo = url.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i);
  if (isVideo) {
    return (
      <video 
        src={url} 
        className={className} 
        autoPlay 
        muted 
        loop 
        playsInline 
      />
    );
  }
  return <img src={url} alt={alt} className={className} />;
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdvertiseOpen, setIsAdvertiseOpen] = useState(false);

  const { data: sponsors } = trpc.sponsors.list.useQuery();
  const sidebarSponsor = sponsors?.find(s => s.location === 'sidebar' && s.active);
  const horizontalSponsor = sponsors?.find(s => s.location === 'horizontal_bottom' && s.active);
  const topSponsor = sponsors?.find(s => s.location === 'top_banner' && s.active);


  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery();
  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search/${encodeURIComponent(searchQuery)}`);
    }
  };

  if (articlesLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="bg-black border-b border-gray-800 py-4 px-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Skeleton className="h-10 w-32 bg-gray-900" />
            <Skeleton className="h-8 w-64 bg-gray-900 hidden md:block" />
            <Skeleton className="h-10 w-48 bg-gray-900" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <Skeleton className="lg:col-span-2 h-96 bg-gray-900" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3 bg-gray-900 mb-4" />
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-gray-900" />
              ))}
            </div>
          </div>
          <div className="mb-12">
            <Skeleton className="h-8 w-1/4 bg-gray-900 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72 w-full bg-gray-900" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Filter out duplicate articles if any
  const uniqueArticles = articles ? articles.filter((article, index, self) =>
    index === self.findIndex((t) => t.id === article.id)
  ) : [];

  const featuredArticles = uniqueArticles?.slice(0, 6) || [];
  const sidebarArticles = uniqueArticles?.slice(6, 10) || [];
  const gridArticles = uniqueArticles?.slice(10, 20) || [];

  useEffect(() => {
    if (featuredArticles.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [featuredArticles.length]);

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString('pt-BR');
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* News Ticker */}
      <div className="news-ticker">
        <div className="news-ticker-content">
          <span className="mx-8">🔴 URGENTE: Acompanhe as últimas notícias de Campos dos Goytacazes e Região em tempo real</span>
          <span className="mx-8">📈 ECONOMIA: Receita petrolífera de Campos registra queda de 58%</span>
          <span className="mx-8">⚖️ JUSTIÇA: Operação da PF investiga fraudes na educação em Campos</span>
          <span className="mx-8">🌊 CLIMA: Defesa Civil emite alerta de ressaca para o Farol de São Thomé</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-2 text-foreground hover:text-accent transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo */}
              <Link href="/" className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black leading-none tracking-tighter">
                  <span className="text-accent">TISGGO</span>
                  <span className="text-foreground">NEWS</span>
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                  Campos dos Goytacazes
                </span>
              </Link>
            </div>

            {/* Navigation (Desktop) */}
            <nav className="hidden xl:flex items-center gap-4">
              {categories?.slice(0, 8).map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="text-sm font-bold uppercase text-muted-foreground hover:text-accent transition-colors">
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Search & Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <WeatherWidget />
              </div>
              <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-muted border border-border rounded">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none px-3 py-2 text-sm w-24 md:w-32 text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="px-3 py-2 bg-accent text-black hover:bg-yellow-500 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
              <ThemeToggle />
              <button 
                onClick={() => setIsAdvertiseOpen(true)}
                className="hidden sm:block px-3 py-1.5 bg-accent text-black text-xs font-black hover:bg-yellow-500 transition-colors"
              >
                ANUNCIE
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Category Scroll Bar */}
        <div className="xl:hidden border-b border-border bg-card/50 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 px-4 py-3 whitespace-nowrap">
            {categories?.map((cat) => (
              <Link 
                key={cat.id} 
                href={`/category/${cat.slug}`} 
                className="text-[11px] font-black uppercase text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <span>{getCategoryEmoji(cat.name)}</span>
                {cat.name}
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
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-sm font-bold uppercase"
                        >
                          <span className="text-xl">{getCategoryEmoji(cat.name)}</span>
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAdvertiseOpen(true);
                      }}
                      className="w-full py-3 bg-accent text-black font-black text-sm uppercase rounded-lg hover:bg-yellow-500 transition-colors"
                    >
                      Anuncie no Portal
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <AdvertiseModal 
        isOpen={isAdvertiseOpen} 
        onClose={() => setIsAdvertiseOpen(false)} 
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Article + Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Main Slider */}
          <div className="lg:col-span-2 relative h-[400px] md:h-[500px] rounded-xl overflow-hidden group shadow-2xl">
            {featuredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: currentSlide === index ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                style={{ pointerEvents: currentSlide === index ? 'auto' : 'none' }}
              >
                <Link 
                  href={`/article/${article.slug || article.id}`} 
                  className="block h-full relative"
                  onMouseEnter={() => {
                    utils.articles.getBySlug.prefetch({ slug: article.slug || article.id });
                  }}
                >
                  {/* Background Image */}
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    <div className="flex gap-2 mb-4">
                      <Badge className="bg-red-600 text-white border-none font-bold">DESTAQUE</Badge>
                      <Badge className="bg-accent text-black border-none font-bold">URGENTE</Badge>
                    </div>
                    <h1 className="text-2xl md:text-5xl font-serif font-black text-white leading-[0.9] mb-4 drop-shadow-lg">
                      {article.title}
                    </h1>
                    <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-6 max-w-2xl leading-relaxed hidden md:block">
                      {(article.excerpt || article.content).replace(/<[^>]*>/g, '').substring(0, 180)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                      <span>•</span>
                      <span>Equipe Editorial</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Slider Dots */}
            <div className="absolute bottom-6 right-10 flex gap-2 z-20">
              {featuredArticles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === i ? "bg-accent w-8" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Sidebar - Featured Articles & Sponsor */}
          <div className="space-y-6">
            {/* Sidebar Sponsor Card */}
            {sidebarSponsor ? (
              <div 
                className="bg-card border border-accent/20 rounded-xl overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => {
                  if (sidebarSponsor.whatsapp) window.open(sidebarSponsor.whatsapp, '_blank');
                  else if (sidebarSponsor.instagram) window.open(sidebarSponsor.instagram, '_blank');
                }}
              >
                <div className="bg-accent/10 px-4 py-2 border-b border-accent/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-accent tracking-widest">Patrocínio Master</span>
                  <div className="flex gap-2">
                    {sidebarSponsor.instagram && <Instagram className="w-3 h-3 text-accent" />}
                    {sidebarSponsor.whatsapp && <MessageCircle className="w-3 h-3 text-accent" />}
                  </div>
                </div>
                <div className="p-0 h-48 relative">
                  {renderMedia(sidebarSponsor.image, sidebarSponsor.name, "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500")}
                </div>
                <div className="p-3 bg-accent/5 flex justify-center gap-4">
                   {sidebarSponsor.instagram && (
                     <a href={sidebarSponsor.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                       <Instagram className="w-4 h-4" />
                     </a>
                   )}
                   {sidebarSponsor.whatsapp && (
                     <a href={sidebarSponsor.whatsapp} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                       <MessageCircle className="w-4 h-4" />
                     </a>
                   )}
                </div>
              </div>
            ) : (
              <div 
                className="bg-card border border-accent/20 rounded-xl overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => setIsAdvertiseOpen(true)}
              >
                <div className="bg-accent/10 px-4 py-2 border-b border-accent/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-accent tracking-widest">Patrocínio Master</span>
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-black text-foreground mb-2">SUA MARCA AQUI</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Alcance milhares de leitores diários no maior portal de Campos e região.
                  </p>
                  <Button size="sm" className="mt-4 w-full bg-accent text-black font-black hover:bg-yellow-500">
                    SAIBA MAIS
                  </Button>
                </div>
              </div>
            )}
            <h3 className="text-lg font-black uppercase text-foreground mb-4">Destaque</h3>
            {sidebarArticles.map((article) => (
              <Link 
                key={article.id} 
                href={`/article/${article.slug || article.id}`} 
                className="group block"
                onMouseEnter={() => {
                  utils.articles.getBySlug.prefetch({ slug: article.slug || article.id });
                }}
              >
                <div className="bg-card border border-border hover:border-accent transition-colors rounded p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold flex-shrink-0">
                      {categories?.find(c => String(c.id) === String(article.categoryId))?.name}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Eye className="w-3 h-3" />
                    <span>{article.views || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Grid of Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-black uppercase mb-6">Últimas Notícias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridArticles.map((article) => (
              <Link 
                key={article.id} 
                href={`/article/${article.slug || article.id}`} 
                className="group block"
                onMouseEnter={() => {
                  utils.articles.getBySlug.prefetch({ slug: article.slug || article.id });
                }}
              >
                <div className="bg-card border border-border hover:border-accent transition-all duration-300 rounded overflow-hidden hover:shadow-lg hover:shadow-accent/20">
                  {/* Image */}
                  <div className="relative overflow-hidden bg-gray-800 aspect-video">
                    {article.coverImage ? (
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold mb-2">
                      {categories?.find(c => String(c.id) === String(article.categoryId))?.name}
                    </Badge>
                    <h3 className="text-lg font-bold font-sans text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                      {article.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {(article.excerpt || article.content).replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{article.views || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Horizontal Sponsor Banner */}
        <div className="mt-20">
          {horizontalSponsor ? (
            <div 
              className="w-full h-32 md:h-44 bg-card border border-accent/30 rounded-xl flex items-center justify-center group cursor-pointer hover:border-accent transition-all relative overflow-hidden"
              onClick={() => {
                if (horizontalSponsor.whatsapp) window.open(horizontalSponsor.whatsapp, '_blank');
                else if (horizontalSponsor.instagram) window.open(horizontalSponsor.instagram, '_blank');
              }}
            >
              {renderMedia(horizontalSponsor.image, horizontalSponsor.name, "absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity")}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="relative z-10 w-full px-8 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase text-accent tracking-[0.4em] block">Parceiro Estratégico</span>
                </div>
                <div className="flex gap-4">
                   {horizontalSponsor.instagram && (
                     <div className="bg-black/50 p-3 rounded-full border border-white/10 hover:border-accent transition-colors">
                       <Instagram className="w-6 h-6 text-accent" />
                     </div>
                   )}
                   {horizontalSponsor.whatsapp && (
                     <div className="bg-black/50 p-3 rounded-full border border-white/10 hover:border-accent transition-colors">
                       <MessageCircle className="w-6 h-6 text-accent" />
                     </div>
                   )}
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="w-full h-32 md:h-44 bg-gradient-to-r from-black via-gray-900 to-black border border-accent/30 rounded-xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer hover:border-accent transition-all relative overflow-hidden"
              onClick={() => setIsAdvertiseOpen(true)}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase text-accent tracking-[0.4em] mb-4 block">Parceiro Estratégico Premium</span>
                <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tighter uppercase leading-none">Sua Marca no Portal do Maior Influenciador da Região</h2>
                <p className="text-sm md:text-base text-gray-400 font-medium italic">Alcance milhares de pessoas em Campos dos Goytacazes com exclusividade.</p>
              </div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="absolute bottom-0 right-0 p-2 opacity-20">
                <Zap className="w-12 h-12 text-accent" />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <Link href="/" className="text-2xl font-black mb-4 block">
                <span className="text-accent">TISGGO</span>
                <span className="text-foreground">NEWS</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed">
                O portal de notícias líder em Campos dos Goytacazes e região. Informação com credibilidade e agilidade.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Categorias</h4>
              <ul className="space-y-3">
                {categories?.slice(0, 5).map(cat => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Empresa</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <button 
                    onClick={() => setIsAdvertiseOpen(true)}
                    className="hover:text-accent transition-colors text-left w-full"
                  >
                    Contato
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setIsAdvertiseOpen(true)}
                    className="hover:text-accent transition-colors text-left w-full"
                  >
                    Anuncie
                  </button>
                </li>
                <li><Link href="/admin" className="hover:text-accent transition-colors italic">Portal de notícias adm</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-accent transition-colors">Privacidade</Link></li>
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-accent transition-colors">Termos</Link></li>
                <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-accent transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-xs text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Tisggo News. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
