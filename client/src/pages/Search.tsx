import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, ChevronRight, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const { query } = useParams<{ query: string }>();
  const { data: results, isLoading } = trpc.articles.search.useQuery(query || "");
  const { data: categories } = trpc.categories.list.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/">
            <span className="text-2xl font-black cursor-pointer">
              <span className="text-accent">TISGO</span>
              <span className="text-white">NEWS</span>
            </span>
          </Link>
          <Link href="/">
            <span className="flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors cursor-pointer text-gray-400">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </span>
          </Link>
        </div>
      </header>

      {/* Search Results */}
      <motion.section
        className="max-w-7xl mx-auto px-4 py-12 md:py-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-accent" />
            <h1 className="text-3xl md:text-4xl font-black uppercase">
              Resultados para "{query}"
            </h1>
          </div>
          <p className="text-gray-500 font-bold">
            {results?.length || 0} resultado{results?.length !== 1 ? "s" : ""} encontrado{results?.length !== 1 ? "s" : ""}
          </p>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-6" />
        </div>

        {results && results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link href={`/article/${article.slug}`}>
                  <Card className="overflow-hidden bg-gray-900 border-gray-800 hover:border-accent transition-all duration-300 h-full flex flex-col group cursor-pointer">
                    <div className="aspect-video bg-gray-800 flex-shrink-0 relative overflow-hidden">
                      {article.coverImage ? (
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-accent/20 to-accent/5 w-full h-full" />
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-accent text-black font-bold">
                          {categories?.find(c => String(c.id) === String(article.categoryId))?.name || 'Geral'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 className="font-black text-lg mb-2 group-hover:text-accent transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2 flex-grow">
                        {article.excerpt || article.content.substring(0, 100)}
                      </p>
                      <div className="flex items-center text-accent text-sm font-black mt-3 uppercase tracking-tighter">
                        Ler notícia <ChevronRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-6">
              <Search className="w-16 h-16 text-gray-800 mx-auto opacity-50" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-2">Nenhum resultado encontrado</h2>
            <p className="text-gray-500 font-bold mb-6">
              Tente usar outras palavras-chave ou navegue pelas categorias
            </p>
            <Link href="/">
              <Button className="bg-accent text-black font-bold hover:bg-yellow-500 px-8 py-6 h-auto">Voltar para Home</Button>
            </Link>
          </div>
        )}
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 py-12 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-black">
                <span className="text-accent">TISGO</span>
                <span className="text-white">NEWS</span>
              </span>
              <p className="text-sm text-gray-500 mt-2">
                Portal de notícias premium com conteúdo de qualidade
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Categorias</h4>
              <ul className="space-y-2 text-sm">
                {categories?.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`}>
                      <span className="text-gray-400 hover:text-accent transition-colors cursor-pointer">
                        {cat.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Sobre</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Sobre nós</a></li>
                <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Contato</a></li>
                <li><Link href="/admin/dashboard"><span className="text-gray-400 hover:text-accent transition-colors cursor-pointer">Portal de notícias adm</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-sm mb-4">Redes Sociais</h4>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-accent transition-colors">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-accent transition-colors">Facebook</a>
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8" />
          <p className="text-center text-sm text-gray-500">
            &copy; 2026 Tisgo News. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
