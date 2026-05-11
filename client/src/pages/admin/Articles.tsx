import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Sparkles, Plus, Edit2, Trash2, Eye, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminArticles() {
  const { data: articles, isLoading, refetch } = trpc.articles.list.useQuery();
  const deleteMutation = trpc.articles.delete.useMutation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = articles?.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este artigo?")) {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase text-white tracking-tighter">Artigos</h1>
          <p className="text-gray-500 text-sm font-medium">Gerencie o conteúdo do portal Tisgo</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/articles/new">
            <Button className="bg-accent text-black hover:bg-yellow-500 font-bold px-6 py-6 h-auto text-lg shadow-lg shadow-accent/20">
              <Plus className="w-5 h-5 mr-2" />
              Novo Artigo
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-muted/40 p-4 rounded-2xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por título ou autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="outline" className="border-border text-muted-foreground gap-2 w-full md:w-auto h-11 px-6 rounded-xl bg-background hover:bg-muted">
          <Filter className="w-4 h-4" />
          {filteredArticles?.length || 0} Resultados
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full bg-gray-900 rounded-xl border border-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredArticles?.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group"
            >
              <div className="bg-card border border-border hover:border-accent/40 transition-all duration-300 rounded-[24px] overflow-hidden shadow-sm hover:shadow-accent/5">
                <div className="flex items-center p-5 gap-6">
                  <div className="hidden md:block w-24 h-24 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                    {article.coverImage ? (
                      <img src={article.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${article.published === true ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'} text-[10px] font-black uppercase rounded-lg border px-3`}>
                        {article.published === true ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <h3 className="font-black text-xl text-foreground group-hover:text-accent transition-colors truncate mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-md border border-border">
                        <Eye className="w-3 h-3 text-accent" />
                        {article.views || 0}
                      </span>
                      <span>•</span>
                      <span>{formatDate(article.createdAt)}</span>
                      <span>•</span>
                      <span className="text-muted-foreground">Por {article.author}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pr-2">
                    <Link href={`/admin/articles/${article.id}/edit`}>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl w-11 h-11 border border-transparent hover:border-accent/20">
                        <Edit2 className="w-5 h-5" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl w-11 h-11 border border-transparent hover:border-red-500/20"
                      onClick={() => handleDelete(String(article.id))}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredArticles?.length === 0 && (
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
              <p className="text-gray-500 font-bold">Nenhum artigo encontrado para sua busca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
