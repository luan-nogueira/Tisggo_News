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
import { onSnapshot, doc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [limit, setLimit] = useState(20);
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery(limit);
  const { data: categories } = trpc.categories.list.useQuery();
  const deleteArticle = trpc.articles.delete.useMutation();
  const automateNews = trpc.articles.automate.useMutation();
  const [isAutomating, setIsAutomating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const runCleanup = trpc.articles.cleanup.useMutation({
    onSuccess: (count) => {
      toast.success(`Faxina concluída! ${count} notícias foram limpas.`);
      utils.articles.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro na faxina: ${err.message}`);
    }
  });
  
  const runRecategorize = trpc.articles.recategorize.useMutation({
    onSuccess: (count) => {
      toast.success(`Organização concluída! ${count} notícias foram movidas.`);
      utils.articles.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro na organização: ${err.message}`);
    }
  });
  
  // Settings State
  const { data: savedSettings } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();
  
  const [automationInterval, setAutomationInterval] = useState("4");
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<any>(null);

  const { data: stats } = trpc.analytics.getStats.useQuery();

  // Robust Icon switcher for Admin
  useEffect(() => {
    const updateIcons = () => {
      const link: any = document.querySelector("link[rel*='icon']");
      const appleLink: any = document.querySelector("link[rel='apple-touch-icon']");
      if (link && link.href !== "/admin-icon.png") link.href = "/admin-icon.png";
      if (appleLink && appleLink.href !== "/admin-icon.png") appleLink.href = "/admin-icon.png";
    };
    
    updateIcons();
    const interval = setInterval(updateIcons, 1000);
    
    return () => {
      clearInterval(interval);
      const link: any = document.querySelector("link[rel*='icon']");
      const appleLink: any = document.querySelector("link[rel='apple-touch-icon']");
      if (link) link.href = "/news-icon.png";
      if (appleLink) appleLink.href = "/news-icon.png";
    };
  }, []);

  // Listener for real-time progress
  useEffect(() => {
    const unsub = onSnapshot(doc(firestoreDb, "automation_status", "current"), (doc) => {
      if (doc.exists()) {
        setAutomationStatus(doc.data());
      }
    });
    return () => unsub();
  }, []);

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
      if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
      return d.toLocaleDateString('pt-BR');
    } catch (e) {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle.mutateAsync(id);
      utils.articles.list.invalidate();
      toast.success("Artigo deletado com sucesso!");
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar artigo.");
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

        {/* Real-time Progress Bar */}
        {automationStatus?.isAutomating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-accent/30 rounded-2xl p-8 mb-12 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-xl animate-pulse">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">O Robô está trabalhando</h3>
                  <p className="text-muted-foreground text-sm font-bold animate-pulse">{automationStatus.message}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-accent">{automationStatus.progress}%</span>
              </div>
            </div>
            <div className="relative z-10">
              <Progress value={automationStatus.progress} className="h-3 bg-muted" />
            </div>
          </motion.div>
        )}

        {/* Audience Analytics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 mb-12 shadow-xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Top Notícias (Mais Lidas)</h2>
          </div>
          
          <div className="h-[300px] w-full relative z-10">
            {stats?.topArticles && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topArticles} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={180} 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: '800', fontFamily: 'Outfit' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(214, 158, 46, 0.05)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '16px', 
                      fontSize: '12px', 
                      color: 'hsl(var(--foreground))', 
                      fontWeight: '800', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.2)' 
                    }}
                    itemStyle={{ color: '#D69E2E' }}
                  />
                  <Bar dataKey="views" radius={[0, 50, 50, 0]} barSize={28}>
                    {stats.topArticles.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? '#D69E2E' : 'hsl(var(--muted-foreground))'} 
                        fillOpacity={index === 0 ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

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
                Faxina Profunda (Remover Marcas/Erros)
              </Button>
              <Button
                onClick={() => runRecategorize.mutate()}
                disabled={runRecategorize.isPending}
                className="bg-background text-foreground hover:bg-accent/10 font-bold flex items-center gap-2 border border-border"
              >
                {runRecategorize.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <Plus className="w-4 h-4 text-accent" />
                )}
                Organizar Categorias
              </Button>
              <Button
                onClick={handleAutomate}
                disabled={isAutomating || automationStatus?.isAutomating}
                className="bg-background text-foreground hover:bg-accent/10 font-bold flex items-center gap-2 border border-border"
              >
                {(isAutomating || automationStatus?.isAutomating) ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <Sparkles className="w-4 h-4 text-accent" />
                )}
                {automationStatus?.isAutomating ? "Puxando..." : "Buscar Agora"}
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
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                            {article.coverImage ? (
                              <img src={article.coverImage} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Eye className="w-3 h-3 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="max-w-[200px] md:max-w-[400px]">
                            <p className="font-black text-sm text-foreground truncate">{article.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-none font-black text-[10px]">
                          {categories?.find(c => String(c.id) === String(article.categoryId))?.name || "Geral"}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <Eye className="w-3 h-3 text-accent" />
                          {article.views || 0}
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-muted-foreground text-xs font-bold">
                        {formatDate(article.publishedAt || article.createdAt)}
                      </td>
                      <td className="py-2 px-4 text-center">
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
                            onClick={() => setDeleteId(String(article.id))}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Custom Delete Modal */}
              {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-card border border-border p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
                  >
                    <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black uppercase text-foreground mb-4">Tem certeza?</h3>
                    <p className="text-muted-foreground font-bold mb-8">
                      Esta ação não pode ser desfeita. A notícia será removida permanentemente do portal.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={() => handleDelete(deleteId)}
                        className="bg-red-600 hover:bg-red-700 text-white font-black py-6 rounded-2xl"
                        disabled={deleteArticle.isPending}
                      >
                        {deleteArticle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "SIM, DELETAR NOTÍCIA"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setDeleteId(null)}
                        className="font-black py-6 rounded-2xl border-border text-foreground"
                      >
                        CANCELAR
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}
              
              {articles.length >= 20 && (
                <div className="p-4 border-t border-border flex justify-center gap-4">
                  {limit > 20 && (
                    <Button 
                      onClick={() => setLimit(prev => Math.max(20, prev - 20))}
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground font-bold text-xs uppercase"
                    >
                      Ver menos
                    </Button>
                  )}
                  <Button 
                    onClick={() => setLimit(prev => prev + 20)}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-black font-black text-xs uppercase px-8"
                  >
                    Carregar mais notícias
                  </Button>
                </div>
              )}
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
