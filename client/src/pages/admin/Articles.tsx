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

  const handleDelete = async (id: number) => {
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

      <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filtrar por título ou autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-accent outline-none transition-colors text-white"
          />
        </div>
        <Button variant="outline" className="border-gray-800 text-gray-400 gap-2 w-full md:w-auto">
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
              <div className="bg-gray-900 border border-gray-800 hover:border-accent/50 transition-all duration-300 rounded-xl overflow-hidden shadow-sm hover:shadow-accent/5">
                <div className="flex items-center p-4 gap-6">
                  <div className="hidden md:block w-24 h-24 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                    {article.coverImage ? (
                      <img src={article.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge className={`${article.published === true ? 'bg-green-600' : 'bg-gray-700'} text-white text-[10px] font-black uppercase`}>
                        {article.published === true ? "Publicado" : "Rascunho"}
                      </Badge>
                      <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                        ID: {article.id}
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-white group-hover:text-accent transition-colors truncate mb-1">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-tight">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {article.views || 0}
                      </span>
                      <span>•</span>
                      <span>{new Date(article.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span className="text-gray-400">Por {article.author}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/articles/${article.id}/edit`}>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-accent hover:bg-accent/10">
                        <Edit2 className="w-5 h-5" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-600 hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDelete(article.id)}
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
