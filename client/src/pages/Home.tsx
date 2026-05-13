import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Zap, Instagram, MessageCircle, Facebook, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { FootballWidget } from "@/components/FootballWidget";
import { AdvertiseModal } from "@/components/AdvertiseModal";
import { Header } from "@/components/Header";
import { getCategoryEmoji } from "@/lib/utils";



const renderMedia = (url: string, alt: string, className: string, hasVideo?: boolean, hideIcon?: boolean) => {
  const isVideo = url.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i);
  if (isVideo) {
    return (
      <div className="relative w-full h-full">
        <video 
          src={url} 
          className={className} 
          autoPlay 
          muted 
          loop 
          playsInline 
        />
        {!hideIcon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-accent/80 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6 text-black fill-black" />
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img src={url} alt={alt} className={className} />
      {hasVideo && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/20 z-10">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-wider">VÍDEO</span>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdvertiseOpen, setIsAdvertiseOpen] = useState(false);

  const { data: rawSponsors } = trpc.sponsors.list.useQuery();
  const [sponsorsMap, setSponsorsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (rawSponsors) {
      const activeSponsors = rawSponsors.filter(s => s.active);
      const grouped: Record<string, any[]> = {};
      activeSponsors.forEach(s => {
        if (!grouped[s.location]) grouped[s.location] = [];
        grouped[s.location].push(s);
      });
      
      Object.keys(grouped).forEach(k => {
        grouped[k] = grouped[k].sort(() => 0.5 - Math.random());
      });
      setSponsorsMap(grouped);
    }
  }, [rawSponsors]);

  const topBannerSponsor = sponsorsMap['top_banner']?.[0];
  const middleSponsor = sponsorsMap['horizontal_middle']?.[0];
  const horizontalSponsor = sponsorsMap['horizontal_bottom']?.[0];
  const sidebarSponsors = sponsorsMap['sidebar']?.slice(0, 5) || [];
  const homeSportsSponsor = sponsorsMap['home_sports']?.[0];


  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery();
  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();

  const uniqueArticles = articles ? articles.filter((article, index, self) =>
    index === self.findIndex((t) => t.id === article.id)
  ) : [];

  const featuredArticles = (() => {
    if (!uniqueArticles?.length) return [];
    const categoriesSet = new Set();
    const diversified: any[] = [];
    const others: any[] = [];

    // Prioritize diversity in the top 6
    uniqueArticles.forEach(article => {
      if (!categoriesSet.has(article.categoryId) && diversified.length < 6) {
        diversified.push(article);
        categoriesSet.add(article.categoryId);
      } else {
        others.push(article);
      }
    });

    // If we still have space, try to add second articles from different categories 
    // instead of just taking the next most recent (which might be the same category)
    if (diversified.length < 6) {
       const secondPassCategories = new Set();
       const secondPass: any[] = [];
       const remainingOthers: any[] = [];

       others.forEach(article => {
         if (!secondPassCategories.has(article.categoryId) && (diversified.length + secondPass.length) < 6) {
           secondPass.push(article);
           secondPassCategories.add(article.categoryId);
         } else {
           remainingOthers.push(article);
         }
       });

       diversified.push(...secondPass);
       others.splice(0, others.length, ...remainingOthers);
    }

    // Finally, fill remaining spots if any
    while (diversified.length < 6 && others.length > 0) {
      diversified.push(others.shift());
    }
    return diversified;
  })();

  // Specific Categories for Layout Sections
  const getArticlesByCategory = (slug: string, limit = 4) => {
    // Procura por slug exato ou nome (normalizado)
    const category = categories?.find(c => 
      c.slug === slug || 
      c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === slug
    );
    if (!category) return [];
    return uniqueArticles
      .filter(a => !featuredArticles.find(f => f.id === a.id)) // Skip featured
      .filter(a => String(a.categoryId) === String(category.id))
      .slice(0, limit);
  };

  const politicsArticles = getArticlesByCategory('politica', 4);
  const policeArticles = getArticlesByCategory('policia', 4);
  const cityArticles = getArticlesByCategory('cidades', 6); // Aumentado para 6

  const remainingArticles = uniqueArticles.filter(a => !featuredArticles.find(f => f.id === a.id));
  const sidebarArticles = remainingArticles.slice(0, 5);
  
  const gridArticles = (() => {
    // Garante que as novas notícias recém-postadas apareçam instantaneamente no feed de "Últimas Notícias",
    // pegando cronologicamente as primeiras mais recentes e mesclando o restante de forma variada.
    const newest = remainingArticles.slice(0, 6);
    const rest = remainingArticles.slice(6);
    
    const categoriesSet = new Set(newest.map(a => a.categoryId));
    const diversified: any[] = [...newest];
    const others: any[] = [];
    
    rest.forEach(article => {
      if (!categoriesSet.has(article.categoryId) && diversified.length < 12) {
        diversified.push(article);
        categoriesSet.add(article.categoryId);
      } else {
        others.push(article);
      }
    });
    
    while (diversified.length < 12 && others.length > 0) {
      diversified.push(others.shift());
    }
    return diversified;
  })();

  useEffect(() => {
    if (featuredArticles.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [featuredArticles.length]);

  if (articlesLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header categories={[]} />
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

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        categories={categories} 
        onOpenAdvertise={() => setIsAdvertiseOpen(true)} 
        showWeather 
      />

      <div className="news-ticker">
        <div className="news-ticker-content">
          <span className="mx-8">Acompanhe as últimas notícias de Campos dos Goytacazes e Região em tempo real</span>
          {uniqueArticles.slice(0, 10).map(article => (
            <span key={article.id} className="mx-8">
              {getCategoryEmoji(categories?.find(c => String(c.id) === String(article.categoryId))?.name || "")} {article.title.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <AdvertiseModal 
        isOpen={isAdvertiseOpen} 
        onClose={() => setIsAdvertiseOpen(false)} 
      />

      <main className="max-w-[1600px] mx-auto px-4 py-8">
        {topBannerSponsor && (
          <div className="mb-8">
            <div 
              className="w-full bg-card border border-accent/20 rounded-xl group cursor-pointer hover:border-accent transition-all relative overflow-hidden shadow-lg block"
              onClick={() => {
                if (topBannerSponsor.whatsapp) window.open(topBannerSponsor.whatsapp, '_blank');
                else if (topBannerSponsor.instagram) window.open(topBannerSponsor.instagram, '_blank');
              }}
            >
              <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5">
                {topBannerSponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                  <video 
                    src={topBannerSponsor.image} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={topBannerSponsor.image} 
                    alt={topBannerSponsor.name} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                  />
                )}
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-sm z-10 shadow-md">
                Patrocinador
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 items-start">
          <div className="lg:col-span-2 space-y-8">
            {featuredArticles.length > 0 && (
              <div className="relative h-[400px] md:h-[500px] rounded-xl overflow-hidden group shadow-2xl">
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
                        utils.articles.bySlug.prefetch(article.slug || article.id);
                      }}
                    >
                      {renderMedia(article.coverImage || "", article.title, "absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700", !!(article as any).videoUrl)}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                        <div className="flex gap-2 mb-4">
                          <Badge className="bg-red-600 text-white border-none font-bold">DESTAQUE</Badge>
                        </div>
                        <h1 className="text-xl md:text-3xl font-serif font-black text-white leading-tight mb-3 drop-shadow-lg">
                          {article.title}
                        </h1>
                        <p className="text-white/80 text-xs md:text-sm line-clamp-2 mb-6 max-w-xl leading-relaxed hidden md:block drop-shadow">
                          {(() => {
                            const text = (article.excerpt || article.content).replace(/<[^>]*>/g, '');
                            if (text.length <= 160) return text;
                            const truncated = text.substring(0, 160);
                            return truncated.substring(0, Math.max(truncated.lastIndexOf(' '), 0)) + '...';
                          })()}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/60">
                          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}

                <button 
                  onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev - 1 + featuredArticles.length) % featuredArticles.length); }}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/50 hover:bg-accent hover:text-black text-white rounded-full transition-all backdrop-blur-md flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev + 1) % featuredArticles.length); }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/50 hover:bg-accent hover:text-black text-white rounded-full transition-all backdrop-blur-md flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>

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
            )}

            {gridArticles.length > 0 && (
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-accent" />
                    Últimas Notícias
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gridArticles.map((article: any) => (
                      <Link 
                        key={article.id} 
                        href={`/article/${article.slug || article.id}`} 
                        className="group block"
                        onMouseEnter={() => {
                          utils.articles.bySlug.prefetch(article.slug || article.id);
                        }}
                      >
                        <div className="bg-card border border-border hover:border-accent transition-all duration-300 rounded overflow-hidden hover:shadow-lg hover:shadow-accent/20">
                          <div className="relative overflow-hidden bg-gray-800 aspect-video">
                            {article.coverImage || article.videoUrl ? (
                              renderMedia(article.coverImage || "", article.title, "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500", !!article.videoUrl)
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                            )}
                          </div>
                          <div className="p-4">
                            <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold mb-2">
                              {categories?.find(c => String(c.id) === String(article.categoryId))?.name}
                            </Badge>
                            <h3 className="text-base font-bold font-sans text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                              {article.title}
                            </h3>
                            <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                              {(() => {
                                const text = (article.excerpt || article.content).replace(/<[^>]*>/g, '');
                                if (text.length <= 100) return text;
                                const truncated = text.substring(0, 100);
                                return truncated.substring(0, Math.max(truncated.lastIndexOf(' '), 0)) + '...';
                              })()}
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

                {/* City Section (Campos dos Goytacazes) */}
                {cityArticles.length > 0 && (
                  <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-xl">🏙️</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase text-foreground">Campos dos Goytacazes</h2>
                      </div>
                      <Link href="/category/cidades" className="text-xs font-black text-accent hover:underline tracking-widest">VER TUDO</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cityArticles.map(article => (
                        <Link key={article.id} href={`/article/${article.slug}`} className="group flex gap-4 items-center">
                           <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                             {renderMedia(article.coverImage || "", article.title, "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500")}
                           </div>
                           <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                             {article.title}
                           </h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Politics Section */}
                {politicsArticles.length > 0 && (
                  <div className="bg-muted/20 p-6 rounded-2xl border border-border">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-xl">⚖️</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase">Política</h2>
                      </div>
                      <Link href="/category/politica" className="text-xs font-black text-accent hover:underline tracking-widest">VER TUDO</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {politicsArticles.map(article => (
                        <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                          <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-3">
                            {renderMedia(article.coverImage || "", article.title, "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500")}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                            {article.title}
                          </h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Police Section */}
                {policeArticles.length > 0 && (
                  <div className="border-t border-border pt-12">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                          <span className="text-xl">🚨</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase">Polícia & Segurança</h2>
                      </div>
                      <Link href="/category/policia" className="text-xs font-black text-accent hover:underline tracking-widest">VER TUDO</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {policeArticles.map(article => (
                        <Link key={article.id} href={`/article/${article.slug}`} className="group flex gap-4 items-start">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0">
                            {renderMedia(article.coverImage || "", article.title, "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500")}
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 block">Plantão Policial</span>
                             <h4 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                               {article.title}
                             </h4>
                             <p className="text-xs text-muted-foreground mt-2 line-clamp-2 hidden sm:block">
                               {(() => {
                                 const text = (article.excerpt || article.content).replace(/<[^>]*>/g, '');
                                 if (text.length <= 85) return text;
                                 const truncated = text.substring(0, 85);
                                 return truncated.substring(0, Math.max(truncated.lastIndexOf(' '), 0)) + '...';
                               })()}
                             </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {sidebarSponsors.length > 0 ? (
              <div className="space-y-6">
                {sidebarSponsors.map((sponsor) => (
                  <div 
                    key={sponsor.id}
                    className="bg-card border border-accent/20 rounded-xl overflow-hidden shadow-lg group cursor-pointer relative"
                    onClick={() => {
                      if (sponsor.whatsapp) window.open(sponsor.whatsapp, '_blank');
                      else if (sponsor.instagram) window.open(sponsor.instagram, '_blank');
                    }}
                  >
                    <div className="bg-accent/10 px-4 py-2 border-b border-accent/20 flex justify-between items-center backdrop-blur-sm">
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest">{sponsor.name || "Patrocínio"}</span>
                      <div className="flex gap-2">
                        {sponsor.instagram && <Instagram className="w-3 h-3 text-accent" />}
                        {sponsor.whatsapp && <MessageCircle className="w-3 h-3 text-accent" />}
                      </div>
                    </div>
                    <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5">
                      {sponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                        <video 
                          src={sponsor.image} 
                          className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                          autoPlay 
                          muted 
                          loop 
                          playsInline 
                        />
                      ) : (
                        <img 
                          src={sponsor.image} 
                          alt={sponsor.name} 
                          className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                        />
                      )}
                    </div>
                    {(sponsor.instagram || sponsor.whatsapp) && (
                      <div className="p-2.5 bg-accent/5 flex justify-center gap-6 border-t border-accent/10">
                        {sponsor.instagram && (
                          <a 
                            href={sponsor.instagram} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-accent transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Instagram className="w-3.5 h-3.5" />
                            <span>Instagram</span>
                          </a>
                        )}
                        {sponsor.whatsapp && (
                          <a 
                            href={sponsor.whatsapp} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-accent transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="bg-card border border-accent/20 rounded-xl overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => setIsAdvertiseOpen(true)}
              >
                <div className="bg-accent/10 px-4 py-2 border-b border-accent/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-accent tracking-widest">Patrocínio</span>
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

            <h3 className="text-lg font-black uppercase text-foreground mb-4">Esportes</h3>
            <FootballWidget />
            
            {homeSportsSponsor && (
              <div className="mt-6 mb-6">
                <div 
                  className="w-full bg-card border border-accent/20 rounded-xl group cursor-pointer hover:border-accent transition-all relative overflow-hidden shadow-lg block"
                  onClick={() => {
                    if (homeSportsSponsor.whatsapp) window.open(homeSportsSponsor.whatsapp, '_blank');
                    else if (homeSportsSponsor.instagram) window.open(homeSportsSponsor.instagram, '_blank');
                  }}
                >
                  <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5">
                    {homeSportsSponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                      <video 
                        src={homeSportsSponsor.image} 
                        className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                      />
                    ) : (
                      <img 
                        src={homeSportsSponsor.image} 
                        alt={homeSportsSponsor.name} 
                        className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                      />
                    )}
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-sm z-10 shadow-md">
                    Patrocinador
                  </div>
                </div>
              </div>
            )}
            
            <h3 className="text-lg font-black uppercase text-foreground mt-8 mb-4">Destaque</h3>
            {sidebarArticles.map((article) => (
              <Link 
                key={article.id} 
                href={`/article/${article.slug || article.id}`} 
                className="group block"
                onMouseEnter={() => {
                  utils.articles.bySlug.prefetch(article.slug || article.id);
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

        {middleSponsor && (
          <div className="mb-12">
            <div 
              className="w-full bg-card border border-accent/20 rounded-xl group cursor-pointer hover:border-accent transition-all relative overflow-hidden shadow-lg block"
              onClick={() => {
                if (middleSponsor.whatsapp) window.open(middleSponsor.whatsapp, '_blank');
                else if (middleSponsor.instagram) window.open(middleSponsor.instagram, '_blank');
              }}
            >
              <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5">
                {middleSponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                  <video 
                    src={middleSponsor.image} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={middleSponsor.image} 
                    alt={middleSponsor.name} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                  />
                )}
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-sm z-10 shadow-md">
                Patrocinador
              </div>
            </div>
          </div>
        )}

        {horizontalSponsor && (
          <div className="mb-12">
            <div 
              className="w-full bg-card border border-accent/20 rounded-xl group cursor-pointer hover:border-accent transition-all relative overflow-hidden shadow-lg block"
              onClick={() => {
                if (horizontalSponsor.whatsapp) window.open(horizontalSponsor.whatsapp, '_blank');
                else if (horizontalSponsor.instagram) window.open(horizontalSponsor.instagram, '_blank');
              }}
            >
              <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5">
                {horizontalSponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                  <video 
                    src={horizontalSponsor.image} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={horizontalSponsor.image} 
                    alt={horizontalSponsor.name} 
                    className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500 max-h-[180px]" 
                  />
                )}
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-sm z-10 shadow-md">
                Patrocinador
              </div>
            </div>
          </div>
        )}

        <footer className="bg-card border-t border-border mt-20">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="md:col-span-1">
                <Link href="/" className="text-2xl font-black mb-4 block">
                  <span className="text-accent">TISGO</span>
                  <span className="text-foreground">NEWS</span>
                </Link>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  O portal de notícias líder em Campos dos Goytacazes e região. Informação com credibilidade e agilidade.
                </p>
                <div className="flex items-center gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-black transition-all">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-black transition-all">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-black transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </div>
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
                &copy; {new Date().getFullYear()} Tisgo News. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
