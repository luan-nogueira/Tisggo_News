import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvertiseModal } from "@/components/AdvertiseModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Share2, ArrowLeft, Calendar, User, Eye, Link as LinkIcon, MessageCircle, Instagram, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import DOMPurify from "dompurify";
import { Header } from "@/components/Header";


export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const [isAdvertiseOpen, setIsAdvertiseOpen] = useState(false);
  const { data: article, isLoading } = trpc.articles.bySlug.useQuery(slug || "");
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: relatedArticles, isLoading: isLoadingRelated } = trpc.articles.byCategory.useQuery(
    { categoryId: article?.categoryId || "", orderBy: 'recent' },
    { enabled: !!article?.categoryId }
  );

  useSEO({
    title: article?.title || "Artigo",
    description: article?.excerpt || article?.content.substring(0, 160) || "Leia este artigo no Tisgo News",
    image: article?.coverImage || undefined,
    url: typeof window !== "undefined" ? window.location.href : "",
    type: "article",
  });

  if (isLoading) {
    return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-3xl font-bold mb-4">Artigo não encontrado</h1>
        <Link href="/" className="text-accent hover:underline">
          Voltar para home
        </Link>
      </div>
    );
  }

  const publishDate = new Date(article.publishedAt || article.createdAt);
  const readingTime = Math.ceil(article.content.split(/\s+/).length / 200);
  const category = categories?.find(c => String(c.id) === String(article.categoryId));
  const categoryName = category?.name || "Geral";
  const categorySlug = category?.slug || "geral";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        categories={categories} 
        currentCategoryId={String(article.categoryId)}
        onOpenAdvertise={() => setIsAdvertiseOpen(true)}
        showBack
      />

      {/* News Ticker */}
      <div className="news-ticker">
        <div className="news-ticker-content">
          <span className="mx-8">Acompanhe as últimas notícias de Campos dos Goytacazes e Região em tempo real</span>
          {relatedArticles?.slice(0, 5).map(a => (
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

      {/* Article Content */}
      <motion.article
        className="max-w-7xl mx-auto px-4 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Article Header */}
        <div className="max-w-4xl mx-auto mb-8">
          {/* Full Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-hidden whitespace-nowrap">
            <Link href="/" className="hover:text-accent transition-colors flex-shrink-0">Home</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <Link href={`/category/${categorySlug}`} className="hover:text-accent transition-colors flex-shrink-0">{categoryName}</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-accent font-bold truncate">{article.title}</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Badge className="bg-accent text-black hover:bg-yellow-500 font-bold">
              {categoryName}
            </Badge>
            <span className="text-sm text-gray-400">
              {publishDate instanceof Date && !isNaN(publishDate.getTime()) ? (
                <>
                  {publishDate.toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} às {publishDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : (
                new Date().toLocaleDateString('pt-BR')
              )}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-400">{readingTime} min de leitura</span>
          </div>

          {/* Title */}
          <h1 className="font-serif font-black tracking-tighter leading-[1.1] text-foreground mb-8 text-3xl md:text-5xl lg:text-6xl">
            {article.title}
          </h1>

          {/* Article Meta */}
          <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{article.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{article.views || 0} visualizações</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6" />

          {/* Share Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-gray-400">Compartilhar:</span>
            <Button
              size="sm"
              className="bg-[#25D366] text-white hover:bg-[#128C7E] transition-all duration-300 font-bold border-none"
              onClick={() => {
                const url = window.location.href;
                const text = `Confira esta notícia no Tisgo News: ${article.title}`;
                window.open(
                  `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`,
                  '_blank'
                );
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              className="bg-accent text-black hover:bg-yellow-500 transition-all duration-300 font-bold"
              onClick={() => {
                const url = window.location.href;
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                  '_blank'
                );
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90 transition-all duration-300 font-bold border-none"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({
                    title: article.title,
                    url: url
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(url);
                  alert('Link copiado para compartilhar no Instagram!');
                }
              }}
            >
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700 hover:border-accent text-gray-400 hover:text-accent transition-all duration-300 font-bold"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copiado!');
              }}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>

        {/* Featured Media (Video or Image) */}
        {(article.videoUrl || article.coverImage) && (
          <motion.div
            className="mb-12 rounded-lg overflow-hidden max-w-4xl mx-auto shadow-2xl bg-black"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {article.videoUrl ? (
              <div className="relative pt-[125%] sm:pt-[56.25%] w-full">
                {article.videoUrl.includes('instagram.com') ? (
                  <iframe
                    src={`${article.videoUrl.split('?')[0]}${article.videoUrl.endsWith('/') ? '' : '/'}embed`}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    scrolling="no"
                    allowTransparency={true}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  />
                ) : (
                  <iframe
                    src={article.videoUrl}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Video Player"
                  />
                )}
              </div>
            ) : (
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-auto object-cover max-h-[600px]"
              />
            )}
          </motion.div>
        )}

        {/* Article Body */}
        <div className="w-full px-4 mt-8 mb-12">
          <div className="article-body-wrapper article-body-content">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(article.content.includes('<p') ? article.content : `<p>${article.content.replace(/\n/g, '</p><p>')}</p>`)
              }} 
            />
          </div>
        </div>

        {/* Divider */}
        <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-12" />

        {/* Author Box - Compact version */}
        <div className="max-w-4xl mx-auto bg-muted/30 border border-border rounded-lg p-4 mb-16 flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-black uppercase text-accent mb-0.5 tracking-widest">Postado por</h4>
            <p className="text-sm text-muted-foreground leading-tight">
              <span className="font-bold text-foreground text-base">{article.author || "Equipe Tisgo"}</span>
            </p>
          </div>
        </div>

        {/* Related Articles Section */}
        <section className="max-w-4xl mx-auto border-t border-border pt-12">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-6 h-6 text-accent" />
            <h2 className="text-3xl font-black uppercase">Leia Também</h2>
          </div>

          {isLoadingRelated ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden h-[340px]">
                  <Skeleton className="w-full h-48 bg-muted rounded-none" />
                  <div className="p-6 space-y-4">
                    <Skeleton className="w-1/4 h-4 bg-muted" />
                    <Skeleton className="w-full h-8 bg-muted" />
                    <Skeleton className="w-3/4 h-4 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : relatedArticles && relatedArticles.filter(a => String(a.id) !== String(article.id)).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles
                .filter(a => String(a.id) !== String(article.id))
                .slice(0, 4)
                .map((relatedArticle) => (
                  <Link 
                    key={relatedArticle.id} 
                    href={`/article/${relatedArticle.slug}`} 
                    className="group block"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition-all duration-500 hover:shadow-2xl hover:shadow-accent/10 h-full flex flex-col">
                      <div className="relative overflow-hidden bg-gray-800 aspect-video">
                        {relatedArticle.coverImage ? (
                          <img
                            src={relatedArticle.coverImage}
                            alt={relatedArticle.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-accent text-black hover:bg-yellow-500 font-black text-[10px]">
                            {categoryName}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {new Date(relatedArticle.publishedAt || relatedArticle.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">
                          {(relatedArticle.excerpt || relatedArticle.content).replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-tighter group-hover:translate-x-2 transition-transform">
                          <span>Ler agora</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl py-12 px-6 text-center">
              <p className="text-muted-foreground font-medium italic">Nenhum outro artigo encontrado nesta categoria.</p>
              <Link href="/" className="inline-block mt-4 text-accent font-black text-sm hover:underline">VOLTAR PARA A HOME</Link>
            </div>
          )}
        </section>
      </motion.article>

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
              <h4 className="font-bold uppercase text-sm mb-4">Categorias</h4>
              <ul className="space-y-2">
                {categories?.slice(0, 10).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className="text-sm text-gray-400 hover:text-accent transition-colors">
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
