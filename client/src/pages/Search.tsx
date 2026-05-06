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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-gradient">Tisgo News</a>
          </Link>
          <Link href="/">
            <a className="flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </a>
          </Link>
        </div>
      </header>

      {/* Search Results */}
      <motion.section
        className="container py-12 md:py-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-accent" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Resultados para "{query}"
            </h1>
          </div>
          <p className="text-muted-foreground">
            {results?.length || 0} resultado{results?.length !== 1 ? "s" : ""} encontrado{results?.length !== 1 ? "s" : ""}
          </p>
          <div className="divider-line mt-6" />
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
                  <a className="group">
                    <Card className="overflow-hidden card-hover h-full flex flex-col">
                      <div className="aspect-video bg-muted flex-shrink-0">
                        {article.coverImage ? (
                          <img
                            src={article.coverImage}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-accent/20 to-accent/5 w-full h-full" />
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {categories?.find(c => c.id === article.categoryId)?.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">
                          {article.excerpt || article.content.substring(0, 100)}
                        </p>
                        <div className="flex items-center text-accent text-sm font-medium mt-3">
                          Ler <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    </Card>
                  </a>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-6">
              <Search className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhum resultado encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Tente usar outras palavras-chave ou navegue pelas categorias
            </p>
            <Link href="/">
              <a>
                <Button>Voltar para Home</Button>
              </a>
            </Link>
          </div>
        )}
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12 bg-card">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Tisgo News</h3>
              <p className="text-sm text-muted-foreground">
                Portal de notícias premium com conteúdo de qualidade
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categorias</h4>
              <ul className="space-y-2 text-sm">
                {categories?.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`}>
                      <a className="text-muted-foreground hover:text-accent transition-colors">
                        {cat.name}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sobre</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors">Sobre nós</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-accent transition-colors">Twitter</a>
                <a href="#" className="text-muted-foreground hover:text-accent transition-colors">Facebook</a>
              </div>
            </div>
          </div>
          <div className="divider-line mb-8" />
          <p className="text-center text-sm text-muted-foreground">
            &copy; 2026 Tisgo News. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
