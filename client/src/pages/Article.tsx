import { useParams } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Share2, ArrowLeft, Calendar, User, Eye, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = trpc.articles.bySlug.useQuery(slug || "");
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: relatedArticles, isLoading: isLoadingRelated } = trpc.articles.byCategory.useQuery(
    { categoryId: article?.categoryId || 0, orderBy: 'recent' },
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
      <div className="min-h-screen flex items-center justify-center bg-black">
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
  const categoryName = categories?.find(c => c.id === article.categoryId)?.name;

  return (
    <div className="min-h-screen bg-black text-white">
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
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex flex-col">
              <span className="text-2xl font-black leading-none tracking-tighter">
                <span className="text-accent">TISGO</span>
                <span className="text-white">NEWS</span>
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                Campos dos Goytacazes
              </span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <motion.article
        className="max-w-4xl mx-auto px-4 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Article Header */}
        <div className="mb-8">
          {/* Breadcrumb & Category */}
          <div className="flex items-center gap-3 mb-6">
            <Badge className="bg-accent text-black hover:bg-yellow-500 font-bold">
              {categoryName}
            </Badge>
            <span className="text-sm text-gray-400">
              {publishDate.toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-400">{readingTime} min de leitura</span>
          </div>

          {/* Title */}
          <h1 className="editorial-title mb-8">
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
              className="bg-accent text-black hover:bg-yellow-500 transition-all duration-300 font-bold"
              onClick={() => {
                const url = window.location.href;
                const text = article.title;
                window.open(
                  `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                  '_blank'
                );
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Twitter
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

        {/* Featured Image */}
        {article.coverImage && (
          <motion.div
            className="mb-12 rounded-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-auto object-cover"
            />
          </motion.div>
        )}

        {/* Article Body */}
        <div className="mb-12">
          <div
            className="article-content text-lg leading-relaxed text-gray-300"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-12" />

        {/* Author Box */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-12 hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Sobre o autor</h3>
              <p className="text-gray-400 mb-4 leading-relaxed">
                {article.author} é um jornalista experiente com foco em notícias de tecnologia, inovação e análise de tendências globais.
              </p>
              <Button variant="outline" size="sm" className="border-gray-700 hover:border-accent text-gray-400 hover:text-accent">
                Ver mais artigos
              </Button>
            </div>
          </div>
        </div>

        {/* Related Articles Section */}
        <section className="border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-black mb-8">Artigos Relacionados</h2>

          {isLoadingRelated ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-72">
                  <Skeleton className="w-full h-32 bg-gray-800 rounded-none" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="w-1/3 h-4 bg-gray-800" />
                    <Skeleton className="w-full h-6 bg-gray-800" />
                    <Skeleton className="w-full h-4 bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : relatedArticles && relatedArticles.filter(a => a.id !== article.id).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles
                .filter(a => a.id !== article.id)
                .slice(0, 2)
                .map((relatedArticle) => (
                  <Link key={relatedArticle.id} href={`/article/${relatedArticle.slug}`} className="group block">
                    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/20">
                      <div className="relative overflow-hidden bg-gray-800 aspect-video">
                        {relatedArticle.coverImage ? (
                          <img
                            src={relatedArticle.coverImage}
                            alt={relatedArticle.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                        )}
                      </div>
                      <div className="p-6">
                        <Badge className="bg-accent text-black hover:bg-yellow-500 mb-3 font-bold">
                          {categories?.find(c => c.id === relatedArticle.categoryId)?.name || 'Geral'}
                        </Badge>
                        <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {relatedArticle.excerpt || relatedArticle.content.substring(0, 100)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum artigo relacionado encontrado.</p>
          )}
        </section>
      </motion.article>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-24 pt-12 pb-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
            <div>
              <span className="text-2xl font-black">
                <span className="text-accent">TISGO</span>
                <span className="text-white">NEWS</span>
              </span>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Portal de notícias profissional com conteúdo editorial de qualidade.
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Categorias</h4>
              <ul className="space-y-2">
                {categories?.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className="text-sm text-gray-400 hover:text-accent transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-accent transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Anuncie</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-accent transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8" />
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2026 Tisgo News. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
