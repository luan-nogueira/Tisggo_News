import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Sparkles, Plus, Edit2, Trash2, Eye, Search, Filter, Loader2, RefreshCw, Upload, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminArticles() {
  const { data: articles, isLoading, refetch } = trpc.articles.listAdmin.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const deleteMutation = trpc.articles.delete.useMutation();
  const generateArticleMutation = trpc.ai.generateArticle.useMutation();
  const createArticleMutation = trpc.articles.create.useMutation();
  const automateNews = trpc.articles.automate.useMutation();
  const uploadImageMutation = trpc.sponsors.uploadImage.useMutation();
  const approveMutation = trpc.articles.approve.useMutation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"drafts" | "published">("drafts");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);

  const publishedArticles = articles?.filter(a => a.published !== false);
  const draftArticles = articles?.filter(a => a.published === false);

  const targetPool = activeTab === "drafts" ? draftArticles : publishedArticles;
  const filteredArticles = targetPool?.filter(a => 
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

  const handleAutomate = async () => {
    try {
      setIsAutomating(true);
      await automateNews.mutateAsync();
      toast.success("Busca automática iniciada! Apurando novas pautas em segundo plano.");
    } catch (error: any) {
      toast.error("Erro ao acionar busca de notícias.");
    } finally {
      setIsAutomating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Notícia aprovada e publicada no site com sucesso!");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao aprovar notícia: " + err.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tighter">Artigos</h1>
          <p className="text-gray-500 text-sm font-medium">Gerencie o conteúdo do portal Tisgo</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button 
            onClick={handleAutomate}
            disabled={isAutomating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-sm shadow-lg transition-all border-none flex items-center justify-center gap-2 w-full"
          >
            {isAutomating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCw className="w-4 h-4 text-white" />}
            Buscar Automático
          </Button>

          <Button 
            onClick={() => setIsAiModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold h-12 text-sm shadow-lg hover:opacity-90 transition-all border-none flex items-center justify-center gap-2 w-full"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-yellow-300" />
            Gerar Matéria IA
          </Button>

          <Link href="/admin/articles/new" className="w-full">
            <Button className="bg-accent text-black hover:bg-yellow-500 font-bold h-12 text-sm shadow-lg shadow-accent/20 w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Artigo
            </Button>
          </Link>
        </div>
      </div>

      {/* Abas Premium de Controle Editorial */}
      <div className="flex border-b border-border gap-8 pt-2">
        <button
          onClick={() => setActiveTab("drafts")}
          className={`pb-4 font-black text-lg uppercase transition-all relative flex items-center gap-2 ${
            activeTab === "drafts" ? "text-accent" : "text-muted-foreground hover:text-white"
          }`}
        >
          Aguardando Aprovação
          {draftArticles?.length ? (
            <span className="bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
              {draftArticles.length}
            </span>
          ) : null}
          {activeTab === "drafts" && (
            <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" layoutId="adminTab" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("published")}
          className={`pb-4 font-black text-lg uppercase transition-all relative ${
            activeTab === "published" ? "text-accent" : "text-muted-foreground hover:text-white"
          }`}
        >
          Publicados ({publishedArticles?.length || 0})
          {activeTab === "published" && (
            <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" layoutId="adminTab" />
          )}
        </button>
      </div>

      {/* Modal Redator IA */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            <h2 className="text-2xl font-black uppercase mb-2 text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              Redator IA Tisgo News
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Digite os fatos, um rascunho ou informações preliminares. Nossa IA apurará e estruturará a notícia profissionalmente.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Rascunho / Fatos da Matéria:</label>
                <textarea 
                  rows={5}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: A Defesa Civil emitiu alerta de chuvas fortes para o litoral. Evite áreas alagadas..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {generateArticleMutation.isPending && (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-xs font-bold animate-pulse text-muted-foreground">A IA está estruturando a manchete, o lide e a formatação HTML limpa...</p>
                </div>
              )}

              {aiResult && !generateArticleMutation.isPending && (
                <div className="bg-background/50 border border-accent/20 rounded-2xl p-4 space-y-4 mt-4 animate-fade-in">
                  <div className="border-b border-border pb-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest block">Imagem de Capa da Matéria:</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={aiResult.coverImage || ""} 
                          onChange={(e) => setAiResult({ ...aiResult, coverImage: e.target.value })}
                          placeholder="URL da imagem ou faça upload..."
                          className="flex-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-accent"
                        />
                        <label className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0">
                          {uploadImageMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Upload</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  const res = await uploadImageMutation.mutateAsync({
                                    base64: reader.result as string,
                                    fileName: file.name,
                                    contentType: file.type || "image/jpeg"
                                  });
                                  setAiResult(prev => ({ ...prev, coverImage: res.url }));
                                  toast.success("Imagem enviada com sucesso!");
                                } catch (err: any) {
                                  toast.error("Erro no upload da imagem");
                                }
                              };
                              reader.readAsDataURL(file);
                            }} 
                          />
                        </label>
                      </div>
                      <span className="text-[9px] text-muted-foreground block">A IA buscou da fonte original. Altere ou suba do seu PC se preferir.</span>
                    </div>
                    {aiResult.coverImage && (
                      <div className="h-20 rounded-xl overflow-hidden bg-muted border border-border relative">
                        <img 
                          src={aiResult.coverImage} 
                          alt="Capa" 
                          className="w-full h-full object-cover" 
                          onError={(e)=>{ (e.target as any).src = "https://picsum.photos/800/600?random=2"; }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-b border-border pb-2">
                    <span className="text-[10px] font-black uppercase text-accent tracking-widest block mb-1">Título Sugerido:</span>
                    <input 
                      type="text" 
                      value={aiResult.title || ""} 
                      onChange={(e) => setAiResult({ ...aiResult, title: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-sm font-bold text-foreground outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div className="border-b border-border pb-2">
                    <span className="text-[10px] font-black uppercase text-accent tracking-widest block mb-1">Resumo (Capa):</span>
                    <textarea 
                      rows={2}
                      value={aiResult.excerpt || ""} 
                      onChange={(e) => setAiResult({ ...aiResult, excerpt: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-accent tracking-widest block mb-1">Notícia Completa para Aprovação (HTML):</span>
                    <textarea 
                      rows={7}
                      value={aiResult.content || ""} 
                      onChange={(e) => setAiResult({ ...aiResult, content: e.target.value })}
                      className="w-full font-mono text-xs text-foreground/90 bg-background p-3 rounded-lg border border-border outline-none focus:border-accent transition-colors leading-relaxed"
                    />
                    <span className="text-[9px] text-muted-foreground block mt-1">Dica: Você pode editar e customizar as tags HTML ou o texto livremente antes de publicar.</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-border mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setAiResult(null);
                  }}
                  className="rounded-xl border-border text-muted-foreground"
                >
                  Fechar
                </Button>

                {!aiResult ? (
                  <Button 
                    onClick={async () => {
                      if (!aiPrompt.trim()) return toast.error("Digite algum assunto ou rascunho primeiro!");
                      try {
                        const res = await generateArticleMutation.mutateAsync({ prompt: aiPrompt });
                        setAiResult(res);
                        toast.success("Matéria elaborada! Revise e aprove abaixo.");
                      } catch (err: any) {
                        toast.error(err.message || "Erro ao gerar matéria");
                      }
                    }}
                    disabled={generateArticleMutation.isPending || !aiPrompt.trim()}
                    className="bg-accent text-black font-bold rounded-xl hover:bg-yellow-500"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Elaborar Matéria
                  </Button>
                ) : (
                  <Button 
                    onClick={async () => {
                      try {
                        const targetCat = categories?.find(c => c.slug === aiResult.categorySlug) || categories?.[0];
                        await createArticleMutation.mutateAsync({
                          title: aiResult.title,
                          excerpt: aiResult.excerpt,
                          content: aiResult.content,
                          categoryId: targetCat ? String(targetCat.id) : "1",
                          author: "Equipe Editorial",
                          coverImage: aiResult.coverImage || "",
                          published: true
                        });
                        toast.success("Notícia publicada com sucesso no portal!");
                        setIsAiModalOpen(false);
                        setAiResult(null);
                        setAiPrompt("");
                        refetch();
                      } catch (err: any) {
                        toast.error(err.message || "Erro ao publicar notícia");
                      }
                    }}
                    disabled={createArticleMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                  >
                    {createArticleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Aprovar e Publicar Imediatamente
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                {/* Layout interno: imagem + info + ações */}
                <div className="flex flex-col p-4 gap-3 md:flex-row md:items-center md:p-5 md:gap-6">

                  {/* Linha superior: imagem + meta */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
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
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className={`${
                          article.published === true
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        } text-[10px] font-black uppercase rounded-lg border px-3`}>
                          {article.published === true ? "Publicado" : "Rascunho"}
                        </Badge>
                      </div>
                      <h3 className="font-black text-base md:text-xl text-foreground group-hover:text-accent transition-colors line-clamp-2 md:truncate mb-1.5">
                        {article.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-md border border-border">
                          <Eye className="w-3 h-3 text-accent" />
                          {article.views || 0}
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span>{formatDate(article.createdAt)}</span>
                        <span className="hidden xs:inline">•</span>
                        <span className="text-muted-foreground">Por {article.author}</span>
                      </div>
                    </div>
                  </div>

                  {/* Linha de ações — sempre visíveis */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t border-border md:border-none md:pr-2 flex-wrap">
                    {article.published === false && (
                      <Button
                        onClick={() => handleApprove(String(article.id))}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl gap-2 h-10 px-4 flex-1 md:flex-none text-sm"
                      >
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Aprovar e Publicar</span>
                      </Button>
                    )}
                    <Link href={`/admin/articles/${article.id}/edit`}>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl w-10 h-10 border border-transparent hover:border-accent/20">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl w-10 h-10 border border-transparent hover:border-red-500/20"
                      onClick={() => handleDelete(String(article.id))}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
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
