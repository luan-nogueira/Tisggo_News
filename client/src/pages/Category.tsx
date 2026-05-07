import { useParams } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ChevronRight, ChevronLeft, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 12;

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<'recent' | 'popular'>('recent');

  const { data: categories } = trpc.categories.list.useQuery();
  const category = categories?.find((c) => c.slug === slug);

  const { data: articles, isLoading } = trpc.articles.byCategory.useQuery(
    { categoryId: category?.id || 0, orderBy },
    { enabled: !!category }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
    <div className="min-h-screen bg-black text-white">
      {/* Red Urgent Bar */}
      <div className="bg-red-700 text-white py-2 px-4 text-center text-sm font-bold">
        <span className="inline-block bg-red-900 px-3 py-1 rounded mr-3">URGENTE</span>
        ACOMPANHE AS ÚLTIMAS NOTÍCIAS DA REGIÃO EM TEMPO REAL
      </div>

      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-black">
              <span className="text-accent">TISGO</span>
              <span className="text-white">NEWS</span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Category Header */}
      <motion.section
        className="max-w-7xl mx-auto px-4 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Categorias</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-accent font-bold">{category.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex items-start gap-6">
              <div className="text-5xl">{category.icon || "📰"}</div>
              <div>
                <h1 className="text-5xl md:text-6xl font-black mb-4">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            {/* Ordering Select */}
            <div className="flex-shrink-0">
              <select 
                className="bg-gray-900 border border-gray-800 text-white text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5 outline-none transition-colors"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'recent' | 'popular')}
              >
                <option value="recent">Mais Recentes</option>
                <option value="popular">Mais Populares</option>
              </select>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
        </div>

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
                      <div className="flex flex-col h-full bg-gray-900 border border-gray-800 hover:border-accent transition-all duration-300 rounded overflow-hidden hover:shadow-lg hover:shadow-accent/20">
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
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-accent text-black hover:bg-yellow-500 text-xs font-bold">
                              {category.name}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <h3 className="text-lg font-black mb-2 group-hover:text-accent transition-colors duration-300 line-clamp-2 leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2 flex-grow mb-3 leading-relaxed">
                            {article.excerpt || article.content.substring(0, 100)}
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
                    className="border-gray-700 hover:border-accent disabled:opacity-50 text-gray-400 hover:text-accent"
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
                        className={page === i + 1 ? "bg-accent text-black hover:bg-yellow-500 font-bold" : "border-gray-700 hover:border-accent text-gray-400 hover:text-accent"}
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
                    className="border-gray-700 hover:border-accent disabled:opacity-50 text-gray-400 hover:text-accent"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div variants={itemVariants} className="text-center py-16">
              <p className="text-lg text-gray-400 mb-4">Nenhum artigo encontrado nesta categoria.</p>
              <Link href="/" className="text-accent hover:underline font-bold">
                Voltar para home
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.section>

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
                <li><Link href="/admin/dashboard" className="hover:text-accent transition-colors">Portal de notícias adm</Link></li>
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
