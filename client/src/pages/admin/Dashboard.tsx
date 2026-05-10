import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "wouter";
import { Sparkles, Loader2, Edit2, Trash2, Plus, Eye, FileText, Users, TrendingUp, Clock, ShieldCheck, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const deleteArticle = trpc.articles.delete.useMutation();
  const automateNews = trpc.articles.automate.useMutation();
  const [isAutomating, setIsAutomating] = useState(false);
  
  const runCleanup = trpc.articles.cleanup.useMutation({
    onSuccess: (count) => {
      toast.success(`Faxina concluída! ${count} notícias foram limpas.`);
      utils.articles.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro na faxina: ${err.message}`);
    }
  });
  
  // Settings State
  const { data: savedSettings } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();
  
  const [automationInterval, setAutomationInterval] = useState("4");
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sync settings when loaded
  useEffect(() => {
    if (savedSettings) {
      setAutomationInterval(savedSettings.interval);
      setAutoCleanup(savedSettings.autoCleanup);
    }
  }, [savedSettings]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você não tem permissão para acessar o painel administrativo.</p>
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
        await deleteArticle.mutateAsync(id);
        utils.articles.list.invalidate();
        toast.success("Artigo deletado!");
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const handleAutomate = async () => {
    try {
      setIsAutomating(true);
      await automateNews.mutateAsync();
      toast.success("Notícias automatizadas com sucesso!");
      utils.articles.list.invalidate();
    } catch (error: any) {
      toast.error("Erro ao automatizar notícias: " + error.message);
      console.error("Erro na automação:", error);
    } finally {
      setIsAutomating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateSettings.mutateAsync({
        interval: automationInterval,
        autoCleanup: autoCleanup
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 p-6 md:p-12 min-h-screen bg-background transition-colors duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
            <span>← Voltar para o Site</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={logout} variant="outline" className="border-border text-foreground hover:bg-accent/10">
              Sair do Painel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 border border-border hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Notícias</p>
                <p className="text-4xl font-black text-foreground mt-1">{totalArticles}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 border border-border hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Visualizações</p>
                <p className="text-4xl font-black text-foreground mt-1">{totalViews.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <Eye className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 border border-border hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Publicadas</p>
                <p className="text-4xl font-black text-foreground mt-1">{publishedArticles}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl p-6 border border-border hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Categorias</p>
                <p className="text-4xl font-black text-foreground mt-1">{categories?.length || 0}</p>
              </div>
              <div className="bg-accent/10 p-3 rounded-xl">
                <Users className="w-6 h-6 text-accent" />
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Automation Settings */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase text-accent flex items-center gap-3">
              <Settings className="w-6 h-6" />
              Configurações do Robô
            </h2>
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-accent text-black hover:bg-yellow-500 font-black"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "SALVAR CONFIGURAÇÕES"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-2xl p-8 border border-border shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-colors" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="bg-accent/10 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tighter mb-2">Agendamento</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">Defina o intervalo que o robô deve buscar novas notícias automaticamente.</p>
                  
                  <select 
                    value={automationInterval}
                    onChange={(e) => setAutomationInterval(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-foreground text-sm outline-none focus:border-accent transition-colors"
                  >
                    <option value="1">A cada 1 hora</option>
                    <option value="2">A cada 2 horas</option>
                    <option value="4">A cada 4 horas</option>
                    <option value="6">A cada 6 horas</option>
                    <option value="12">A cada 12 horas</option>
                    <option value="24">A cada 24 horas</option>
                  </select>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-2xl p-8 border border-border shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-colors" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="bg-red-500/10 p-3 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tighter mb-2">Limpeza Automática</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">Apagar notícias com mais de 7 dias para manter o site rápido e leve.</p>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setAutoCleanup(!autoCleanup)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCleanup ? "bg-accent" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCleanup ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <span className="text-sm font-bold text-foreground">{autoCleanup ? "Ativado" : "Desativado"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Articles Management */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-border bg-accent/5">
            <h2 className="text-2xl font-black uppercase text-foreground">Gerenciar Notícias</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => runCleanup.mutate()}
                disabled={runCleanup.isPending}
                className="bg-background text-foreground hover:bg-red-500/10 font-bold flex items-center gap-2 border border-border"
              >
                {runCleanup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                )}
                Faxina Geral
              </Button>
              <Button
                onClick={handleAutomate}
                disabled={isAutomating}
                className="bg-background text-foreground hover:bg-accent/10 font-bold flex items-center gap-2 border border-border"
              >
                {isAutomating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <Sparkles className="w-4 h-4 text-accent" />
                )}
                Buscar Agora
              </Button>
              <Link href="/admin/articles/new">
                <Button className="bg-accent text-black hover:bg-yellow-500 font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  NOVA NOTÍCIA
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
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-6 py-4 font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Título</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Categoria</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Views</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Data</th>
                    <th className="text-left px-6 py-4 font-bold uppercase text-[10px] text-muted-foreground tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-b border-border hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {article.published && (
                            <Badge className="bg-green-600 text-white hover:bg-green-700 text-[10px] font-bold">
                              PUBLICADO
                            </Badge>
                          )}
                          <span className="font-bold text-foreground line-clamp-1">{article.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm font-medium">
                        {categories?.find(c => String(c.id) === String(article.categoryId))?.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{article.views || 0}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {formatDate(article.publishedAt || article.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/admin/articles/${article.id}/edit`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border hover:border-accent text-muted-foreground hover:text-accent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:border-red-600 text-muted-foreground hover:text-red-600"
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
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma notícia encontrada. Crie a primeira!</p>
            </div>
          )}
        </div>
    </div>
  );
}
