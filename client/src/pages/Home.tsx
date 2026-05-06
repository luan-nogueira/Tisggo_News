import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronRight, Eye, LogIn } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

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
      <div className="min-h-screen bg-black text-white">
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

  const mainArticle = articles?.[0];
  const sidebarArticles = articles?.slice(1, 5) || [];
  const gridArticles = articles?.slice(5, 11) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Red Urgent Bar */}
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
            {/* Logo */}
            <Link href="/" className="flex flex-col">
              <span className="text-3xl font-black leading-none tracking-tighter">
                <span className="text-accent">TISGO</span>
                <span className="text-white">NEWS</span>
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                Campos dos Goytacazes
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {categories?.slice(0, 5).map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="text-sm font-bold uppercase text-gray-300 hover:text-accent transition-colors">
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Search & Actions */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-gray-900 border border-gray-700 rounded">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none px-3 py-2 text-sm w-32 text-white placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="px-3 py-2 bg-accent text-black hover:bg-yellow-500 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
              {/* Auth buttons removed from header */}
              <button className="px-4 py-2 bg-accent text-black font-bold hover:bg-yellow-500 transition-colors">
                ANUNCIE
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Article + Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Main Featured Article */}
          {mainArticle && (
            <Link href={`/article/${mainArticle.slug}`} className="lg:col-span-2 group block">
              <div className="relative overflow-hidden rounded-lg h-96 bg-gray-900">
                {mainArticle.coverImage ? (
                  <img
                    src={mainArticle.coverImage}
                    alt={mainArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs font-bold">DESTAQUE</Badge>
                    <Badge className="bg-red-700 text-white hover:bg-red-800 text-xs font-bold">URGENTE</Badge>
                  </div>
                  <h1 className="editorial-title mb-4 group-hover:text-accent transition-colors duration-300">
                    {mainArticle.title}
                  </h1>
                  <p className="text-gray-300 text-sm mb-3">
                    {mainArticle.excerpt || mainArticle.content.substring(0, 100)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(mainArticle.publishedAt || mainArticle.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Sidebar - Featured Articles */}
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase text-accent mb-4">Destaque</h3>
            {sidebarArticles.map((article) => (
              <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                <div className="bg-gray-900 border border-gray-800 hover:border-accent transition-colors rounded p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold flex-shrink-0">
                      {categories?.find(c => c.id === article.categoryId)?.name}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {article.title}
                  </h3>
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
              <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                <div className="bg-gray-900 border border-gray-800 hover:border-accent transition-all duration-300 rounded overflow-hidden hover:shadow-lg hover:shadow-accent/20">
                  {/* Image */}
                  <div className="relative overflow-hidden bg-gray-800 aspect-video">
                    {article.coverImage ? (
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold mb-2">
                      {categories?.find(c => c.id === article.categoryId)?.name}
                    </Badge>
                    <h3 className="font-black text-base mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {article.excerpt || article.content.substring(0, 80)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR')}</span>
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
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-black">
                <span className="text-accent">TISGO</span>
                <span className="text-white">NEWS</span>
              </span>
              <p className="text-gray-400 text-sm mt-2">Portal de notícias profissional</p>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Categorias</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {categories?.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className="hover:text-accent transition-colors">
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
                <li><Link href="/admin" className="hover:text-accent transition-colors">Portal de notícias adm</Link></li>
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
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2026 Tisgo News. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
