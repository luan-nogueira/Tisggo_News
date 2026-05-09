import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Sparkles, Loader2, Edit2, Trash2, Plus, Eye, FileText, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const deleteArticle = trpc.articles.delete.useMutation();
  const automateNews = trpc.articles.automate.useMutation();
  const [isAutomating, setIsAutomating] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-gray-400 mb-6">Você não tem permissão para acessar o painel administrativo.</p>
          <Link href="/" className="text-accent hover:underline">
            Voltar para home
          </Link>
        </div>
      </div>
    );
  }

  const totalArticles = articles?.length || 0;
  const totalViews = articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;
  const publishedArticles = articles?.filter(a => a.published).length || 0;

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este artigo?")) {
      try {
        await deleteArticle.mutateAsync(id);
        window.location.reload();
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const handleAutomate = async () => {
    try {
      setIsAutomating(true);
      const results = await automateNews.mutateAsync();
      toast.success("Notícias automatizadas com sucesso!");
      console.log("Automação concluída:", results);
      window.location.reload();
    } catch (error: any) {
      toast.error("Erro ao automatizar notícias: " + error.message);
      console.error("Erro na automação:", error);
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <div className="space-y-10">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-accent transition-colors mb-8">
          <span>← Voltar para o Site</span>
        </Link>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Notícias</p>
                <p className="text-4xl font-black text-white mt-1">{totalArticles}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Visualizações</p>
                <p className="text-4xl font-black text-white mt-1">{totalViews.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <Eye className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Publicadas</p>
                <p className="text-4xl font-black text-white mt-1">{publishedArticles}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Categorias</p>
                <p className="text-4xl font-black text-white mt-1">{categories?.length || 0}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <Users className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Articles Management */}
        <div className="bg-gray-900 border border-gray-800 rounded">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-2xl font-black uppercase text-accent">Gerenciar Notícias</h2>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAutomate}
                disabled={isAutomating}
                className="bg-white text-black hover:bg-gray-200 font-bold flex items-center gap-2 border-2 border-accent"
              >
                {isAutomating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-accent" />
                )}
                Automatizar Notícias
              </Button>
              <Link href="/admin/articles/new">
                <Button className="bg-accent text-black hover:bg-yellow-500 font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Notícia
                </Button>
              </Link>
            </div>
          </div>

          {articlesLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : articles && articles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-800/50">
                  <tr>
                    <th className="text-left px-6 py-4 font-bold uppercase text-xs text-gray-400">Título</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-xs text-gray-400">Categoria</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-xs text-gray-400">Views</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-xs text-gray-400">Data</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-xs text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {article.published && (
                            <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs font-bold">
                              PUBLICADO
                            </Badge>
                          )}
                          <span className="font-bold text-white line-clamp-1">{article.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {categories?.find(c => String(c.id) === String(article.categoryId))?.name}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{article.views || 0}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(article.publishedAt || article.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/articles/${article.id}/edit`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-700 hover:border-accent text-gray-400 hover:text-accent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 hover:border-red-600 text-gray-400 hover:text-red-600"
                            onClick={() => handleDelete(String(article.id))}
                            disabled={deleteArticle.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Nenhuma notícia encontrada. Crie a primeira!</p>
            </div>
          )}
        </div>
    </div>
  );
}
