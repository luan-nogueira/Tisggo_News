import { useParams } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ChevronRight, ChevronLeft, Eye, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { AdvertiseModal } from "@/components/AdvertiseModal";
import { Header } from "@/components/Header";
import { getCategoryEmoji } from "@/lib/utils";



const ITEMS_PER_PAGE = 12;

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<'recent' | 'popular'>('recent');
  const [isAdvertiseOpen, setIsAdvertiseOpen] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();
  const category = categories?.find((c) => c.slug === slug);

  const { data: articles, isLoading } = trpc.articles.byCategory.useQuery(
    { categoryId: category?.id || "", orderBy },
    { enabled: !!category }
  );

  if (isLoading) {
    return (
    <div className="min-h-screen bg-background text-foreground">
        <Header categories={[]} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-3xl font-bold mb-4">Categoria não encontrada</h1>
        <Link href="/" className="text-accent hover:underline">
          Voltar para home
        </Link>
      </div>
    );
  }

  const paginatedArticles = articles?.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil((articles?.length || 0) / ITEMS_PER_PAGE);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        categories={categories} 
        currentCategoryId={String(category.id)}
        onOpenAdvertise={() => setIsAdvertiseOpen(true)}
        showBack
      />

      {/* News Ticker */}
      <div className="news-ticker">
        <div className="news-ticker-content">
          <span className="mx-8">Acompanhe as últimas notícias de Campos dos Goytacazes e Região em tempo real</span>
          {articles?.slice(0, 10).map(a => (
            <span key={a.id} className="mx-8">
              🗞️ {a.title.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <AdvertiseModal 
        isOpen={isAdvertiseOpen} 
        onClose={() => setIsAdvertiseOpen(false)} 
      />

      {/* Category Header */}
      <motion.section
        className="max-w-[1600px] mx-auto px-4 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/" className="hover:text-accent transition-colors">Categorias</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-accent font-bold">{category.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex items-start gap-6">
              <div className="text-5xl">{getCategoryEmoji(category.name)}</div>
              <div>
                <h1 className="text-5xl md:text-6xl font-black mb-4">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            {/* Ordering Select */}
            <div className="flex-shrink-0">
              <select 
                className="bg-card border border-border text-foreground text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5 outline-none transition-colors"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'recent' | 'popular')}
              >
                <option value="recent">Mais Recentes</option>
                <option value="popular">Mais Populares</option>
              </select>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* ── Sports Section (Football Widget + Articles) ───────────────────── */}
        {(category.slug === "esportes" || category.slug === "esporte" || category.slug === "sports") ? (
          <>
            {/* Brasileirão Feature Banner */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-black uppercase tracking-normal">Futebol ao Vivo</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                <span className="text-xs text-muted-foreground font-medium">Atualizado automaticamente</span>
              </div>

              {/* Wide Football Widget for Sports Page */}
              <SportFootballSection />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10" />
          </>
        ) : null}

        {/* Articles Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {paginatedArticles && paginatedArticles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {paginatedArticles.map((article, idx) => (
                  <motion.div
                    key={article.id}
                    variants={itemVariants}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={`/article/${article.slug}`} className="group block h-full">
                      <div className="flex flex-col h-full bg-card border border-border hover:border-accent transition-all duration-300 rounded overflow-hidden hover:shadow-lg hover:shadow-accent/20">
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
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold">
                              {category.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR', {
                                  day: 'numeric',
                                  month: 'long'
                                })} às {new Date(article.publishedAt || article.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-foreground mb-2 group-hover:text-accent transition-colors duration-300 line-clamp-2 leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 flex-grow mb-3 leading-relaxed">
                            {(article.excerpt || article.content).replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR')}</span>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{article.views || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  variants={itemVariants}
                  className="flex items-center justify-center gap-4 mb-16"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="border-border hover:border-accent disabled:opacity-50 text-muted-foreground hover:text-accent"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button
                        key={i + 1}
                        variant={page === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(i + 1)}
                        className={page === i + 1 ? "bg-accent text-black hover:bg-yellow-500 font-bold" : "border-border hover:border-accent text-muted-foreground hover:text-accent"}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="border-border hover:border-accent disabled:opacity-50 text-muted-foreground hover:text-accent"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div variants={itemVariants} className="text-center py-16">
              {(category.slug === "esportes" || category.slug === "esporte" || category.slug === "sports") ? (
                <p className="text-lg text-muted-foreground mb-4">Nenhuma notícia esportiva publicada ainda. Confira os dados ao vivo acima!</p>
              ) : (
                <p className="text-lg text-muted-foreground mb-4">Nenhum artigo encontrado nesta categoria.</p>
              )}
              <Link href="/" className="text-accent hover:underline font-bold">
                Voltar para home
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.section>


      {/* Footer */}
      <footer className="border-t border-border mt-24 pt-12 pb-8 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
            <div>
              <span className="text-2xl font-black">
                <span className="text-accent">TISGO</span>
                <span className="text-foreground">NEWS</span>
              </span>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Portal de notícias profissional com conteúdo editorial de qualidade.
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm text-foreground mb-4">Categorias</h4>
              <ul className="space-y-2">
                {categories?.slice(0, 10).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button 
                    onClick={() => setIsAdvertiseOpen(true)}
                    className="hover:text-accent transition-colors text-left"
                  >
                    Contato
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setIsAdvertiseOpen(true)}
                    className="hover:text-accent transition-colors text-left"
                  >
                    Anuncie
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-accent transition-colors">Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-accent transition-colors">Termos</Link></li>
                <li><Link href="/cookies" className="hover:text-accent transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Tisgo News. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Zone helpers ──────────────────────────────────────────────────────────────
const ZONE = {
  libertadores: { bar: "bg-blue-500",    row: "bg-blue-500/5"  },
  sulAmericana: { bar: "bg-emerald-500", row: "bg-emerald-500/5"},
  rebaixamento: { bar: "bg-red-600",     row: "bg-red-600/5"   },
  neutral:      { bar: "bg-transparent", row: ""               },
};
function getZone(pos: number) {
  if (pos <= 4)  return ZONE.libertadores;
  if (pos <= 8)  return ZONE.sulAmericana;
  if (pos >= 17) return ZONE.rebaixamento;
  return ZONE.neutral;
}

// ── GE-style Sport Football Section ──────────────────────────────────────────
function SportFootballSection() {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  
  const { data: table, isLoading: tLoading } = trpc.football.table.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
  const { data: games, isLoading: gLoading } = trpc.football.games.useQuery(undefined, {
    refetchInterval: 30 * 1000,
    retry: 2,
  });

  const round = (games as any[])?.[0]?.round;
  const hasLive = (games as any[])?.some((g) => g.status === "live");

  const gamesByDate = (games as any[])?.reduce((acc: any, game) => {
    const date = game.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(game);
    return acc;
  }, {}) || {};

  const dates = Object.keys(gamesByDate).sort((a, b) => {
    const [da, ma] = a.split('/').map(Number);
    const [db, mb] = b.split('/').map(Number);
    return (ma * 100 + da) - (mb * 100 + db);
  });

  if (!activeDay && dates.length > 0) {
    const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    if (dates.includes(today)) {
      setActiveDay(today);
    } else {
      setActiveDay(dates[0]);
    }
  }

  const getDayLabel = (dateStr: string) => {
    const now = new Date();
    const today = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const tomorrowDate = new Date();
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = tomorrowDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    if (dateStr === today) return "Hoje";
    if (dateStr === tomorrow) return "Amanhã";
    
    try {
      const [d, m] = dateStr.split('/');
      const gameDate = new Date(now.getFullYear(), parseInt(m) - 1, parseInt(d));
      return gameDate.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '').toUpperCase();
    } catch { return dateStr; }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-0 rounded-xl overflow-hidden border border-border shadow-lg">
      <div className="xl:col-span-3 border-r border-border">
        <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="font-black text-sm uppercase tracking-wide">Classificação</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Série A · {new Date().getFullYear()}</span>
        </div>

        <div className="bg-muted/50 px-4 py-2 grid items-center gap-x-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground"
          style={{ gridTemplateColumns: "28px 28px 1fr 32px 28px 28px 28px 28px 38px" }}>
          <span className="text-center">#</span>
          <span />
          <span className="pl-1">Clube</span>
          <span className="text-center">P</span>
          <span className="text-center">J</span>
          <span className="text-center">V</span>
          <span className="text-center">E</span>
          <span className="text-center">D</span>
          <span className="text-center">SG</span>
        </div>

        {tLoading ? (
          <div className="divide-y divide-border">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 animate-pulse">
                <div className="w-5 h-3 bg-muted rounded" />
                <div className="w-6 h-6 rounded-full bg-muted" />
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-6 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !(table as any[])?.length ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Dados indisponíveis</div>
        ) : (
          <div className="divide-y divide-border">
            {(table as any[]).map((team) => {
              const zone = getZone(team.pos);
              return (
                <div
                  key={team.pos}
                  className={`grid items-center px-4 py-2 gap-x-1 hover:bg-muted/40 transition-colors ${zone.row}`}
                  style={{ gridTemplateColumns: "28px 28px 1fr 32px 28px 28px 28px 28px 38px" }}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <span className={`w-[3px] h-5 rounded-full flex-shrink-0 ${zone.bar}`} />
                    <span className="text-[11px] text-muted-foreground font-bold">{team.pos}</span>
                  </div>
                  <div className="flex justify-center">
                    {team.shield ? (
                      <img src={team.shield} alt={team.shortName} className="w-6 h-6 object-contain"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-black">
                        {team.shortName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-foreground text-[13px] truncate pl-1">{team.name}</span>
                  <span className="text-center font-black text-accent text-[13px]">{team.points}</span>
                  <span className="text-center text-muted-foreground text-[12px]">{team.games}</span>
                  <span className="text-center text-muted-foreground text-[12px]">{team.wins}</span>
                  <span className="text-center text-muted-foreground text-[12px]">{team.draws}</span>
                  <span className="text-center text-muted-foreground text-[12px]">{team.losses}</span>
                  <span className={`text-center font-semibold text-[12px] ${team.gd > 0 ? "text-emerald-500" : team.gd < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-muted/30 border-t border-border px-4 py-2.5 flex flex-wrap gap-5">
          {[
            { color: "bg-blue-500",    label: "Libertadores (1-4)" },
            { color: "bg-emerald-500", label: "Sul-Americana (5-8)" },
            { color: "bg-red-600",     label: "Rebaixamento (17-20)" },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${z.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium">{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:col-span-2 bg-card/30">
        <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="font-black text-sm uppercase tracking-wide">
              {round ? `${round}ª Rodada` : "Jogos"}
            </span>
          </div>
          {hasLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Ao vivo
            </span>
          )}
        </div>

        <div className="flex border-b border-border bg-muted/20">
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => setActiveDay(date)}
              className={`flex-1 py-3 px-1 text-center transition-all duration-200 border-b-2 ${
                activeDay === date 
                ? "border-accent bg-accent/5 text-accent font-black" 
                : "border-transparent text-muted-foreground hover:text-foreground font-bold text-[10px]"
              }`}
            >
              <div className="text-[11px] uppercase tracking-tighter">{getDayLabel(date)}</div>
              <div className="text-[9px] opacity-60 tabular-nums">{date}</div>
            </button>
          ))}
        </div>

        {gLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-2 animate-pulse">
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-14 h-5 bg-muted rounded" />
                <div className="flex-1 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !activeDay || !gamesByDate[activeDay] ? (
          <div className="py-20 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Zap className="w-8 h-8 opacity-10" />
            Nenhum jogo nesta data
          </div>
        ) : (
          <div className="divide-y divide-border overflow-y-auto max-h-[500px] custom-scrollbar">
            {gamesByDate[activeDay].map((game: any) => (
              <div
                key={game.id}
                className={`px-4 py-4 transition-colors hover:bg-muted/40 ${game.status === "live" ? "bg-red-500/5 border-l-[3px] border-red-500" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <span className="text-[12px] font-black text-foreground truncate text-right leading-tight">
                      {game.homeTeam.shortName || game.homeTeam.name}
                    </span>
                    {game.homeTeam.shield && (
                      <img src={game.homeTeam.shield} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                    )}
                  </div>

                  <div className="flex flex-col items-center w-[64px] flex-shrink-0">
                    {game.status === "live" ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-black text-foreground tabular-nums">{game.homeTeam.score ?? 0}</span>
                          <span className="text-muted-foreground text-sm font-bold">:</span>
                          <span className="text-lg font-black text-foreground tabular-nums">{game.awayTeam.score ?? 0}</span>
                        </div>
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse">Ao vivo</span>
                      </div>
                    ) : game.status === "finished" ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 opacity-80">
                          <span className="text-lg font-black text-foreground tabular-nums">{game.homeTeam.score ?? "0"}</span>
                          <span className="text-muted-foreground text-sm">×</span>
                          <span className="text-lg font-black text-foreground tabular-nums">{game.awayTeam.score ?? "0"}</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Fim</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-accent tabular-nums bg-accent/10 px-2 py-0.5 rounded border border-accent/20">{game.time}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {game.awayTeam.shield && (
                      <img src={game.awayTeam.shield} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                    )}
                    <span className="text-[12px] font-black text-foreground truncate leading-tight">
                      {game.awayTeam.shortName || game.awayTeam.name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
