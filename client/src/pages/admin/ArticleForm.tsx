import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, Save, CheckCircle, Image as ImageIcon, Type, Layout, User, Settings } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { motion } from "framer-motion";

export default function ArticleForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: existingArticle, isLoading: articleLoading } = trpc.articles.get.useQuery(id || "", { 
    enabled: !!id && id !== "new" 
  });
  
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    categoryId: "",
    author: "",
    coverImage: "",
    videoUrl: "",
    published: false,
  });

  useEffect(() => {
    if (existingArticle) {
      setFormData({
        title: existingArticle.title,
        excerpt: existingArticle.excerpt || "",
        content: existingArticle.content,
        categoryId: String(existingArticle.categoryId),
        author: existingArticle.author,
        coverImage: existingArticle.coverImage || "",
        videoUrl: (existingArticle as any).videoUrl || "",
        published: existingArticle.published ?? false,
      });
    }
  }, [existingArticle]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const storageRef = ref(storage, `articles/covers/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          toast.error("Erro ao fazer upload da imagem: " + error.message);
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData({ ...formData, coverImage: downloadURL });
          setIsUploading(false);
          toast.success("Upload concluído!");
        }
      );
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
      setIsUploading(false);
    }
  };

  const createMutation = trpc.articles.create.useMutation({
    onSuccess: () => {
      toast.success("Artigo criado com sucesso!");
      navigate("/admin/articles");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar artigo");
    },
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Artigo atualizado com sucesso!");
      navigate("/admin/articles");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar artigo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.excerpt || !formData.content || !formData.categoryId || !formData.author) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (id) {
      updateMutation.mutate({
        id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (id && articleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-card p-4 md:p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/admin/articles")}
            className="rounded-2xl border-border hover:bg-muted w-11 h-11 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground uppercase truncate">
              {id ? "Editar Notícia" : "Nova Publicação"}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium mt-0.5 hidden sm:block">
              {id ? "Ajuste os detalhes da sua notícia" : "Crie um novo conteúdo de impacto para o Tisgo News"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 md:hidden mt-3">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/articles")}
            className="flex-1 rounded-2xl font-bold text-muted-foreground h-11"
          >
            Descartar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving} 
            className="flex-1 rounded-2xl h-11 bg-accent text-black font-black hover:bg-yellow-500"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {id ? "Salvar" : "Publicar"}
          </Button>
        </div>

        <div className="hidden md:flex items-center justify-end gap-3 -mt-10">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/articles")}
            className="rounded-2xl px-6 font-bold text-muted-foreground hover:text-foreground"
          >
            Descartar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving} 
            className="rounded-2xl px-8 h-12 bg-accent text-black font-black hover:bg-yellow-500 shadow-[0_0_20px_rgba(255,200,0,0.2)]"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {id ? "Salvar Alterações" : "Publicar Notícia"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area — Title and Content */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-6">
          <Card className="bg-card border-border rounded-[32px] overflow-hidden p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-accent">
                <Type className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Informações Principais</span>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Título impactante da notícia..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-transparent border-none text-3xl font-black p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40 text-foreground"
                  required
                />
                <Textarea
                  placeholder="Um breve resumo que chame a atenção do leitor..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="bg-muted/50 border-border rounded-2xl p-4 text-foreground resize-none h-24 focus:border-accent/30 transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-accent">
                <Layout className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Conteúdo do Artigo</span>
              </div>
              
              <div className="bg-muted/30 rounded-3xl overflow-hidden min-h-[400px] border border-border">
                <style>{`
                  .ql-toolbar.ql-snow {
                    border: none !important;
                    border-bottom: 1px solid var(--border) !important;
                    background: var(--muted);
                  }
                  .ql-container.ql-snow {
                    border: none !important;
                    font-family: inherit !important;
                    font-size: 16px !important;
                  }
                  .ql-editor {
                    color: var(--foreground) !important;
                    min-height: 350px;
                  }
                  .ql-editor.ql-blank::before {
                    color: var(--muted-foreground) !important;
                    font-style: normal !important;
                    opacity: 0.5;
                  }
                  .ql-snow .ql-stroke {
                    stroke: var(--muted-foreground) !important;
                  }
                  .ql-snow .ql-fill {
                    fill: var(--muted-foreground) !important;
                  }
                  .ql-snow .ql-picker {
                    color: var(--muted-foreground) !important;
                  }
                  .ql-snow .ql-picker-options {
                    background-color: var(--card) !important;
                    border: 1px solid var(--border) !important;
                    border-radius: 12px !important;
                    padding: 8px !important;
                  }
                `}</style>
                <ReactQuill 
                  theme="snow"
                  value={formData.content}
                  onChange={(val) => setFormData({ ...formData, content: val })}
                  placeholder="Escreva aqui o corpo da sua notícia..."
                  className="h-[350px]"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      [{ 'size': ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                      ['link', 'image', 'video'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar — Settings and Media */}
        <div className="space-y-6 lg:order-2 lg:col-start-3 lg:row-start-1">
          {/* Metadata Card */}
          <Card className="bg-card border-border rounded-[32px] p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 text-accent">
              <Settings className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Configurações</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Categoria</label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
                  <SelectTrigger className="bg-muted border-border rounded-2xl h-12 text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border rounded-2xl text-foreground">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)} className="focus:bg-muted rounded-xl">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Autor</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do autor"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="bg-muted/50 border-border rounded-2xl h-12 pl-12 text-foreground placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Link de Vídeo / Social (Instagram)</label>
                <Input
                  placeholder="https://instagram.com/p/..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="bg-muted/50 border-border rounded-2xl h-12 text-foreground placeholder:text-muted-foreground/50"
                />
                <p className="text-[9px] text-muted-foreground px-1">Insira o link do Instagram ou vídeo para exibição especial.</p>
              </div>

              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-2xl border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">Publicar</span>
                  <span className="text-[10px] text-muted-foreground">Visível no site imediatamente</span>
                </div>
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-5 h-5 accent-accent"
                />
              </div>
            </div>
          </Card>

          {/* Media Card */}
          <Card className="bg-card border-border rounded-[32px] p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 text-accent">
              <ImageIcon className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Capa da Notícia</span>
            </div>

            <div className="space-y-4">
              <div 
                className={`relative group h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden
                  ${formData.coverImage ? 'border-accent/30' : 'border-border hover:border-accent/50'}`}
              >
                {formData.coverImage ? (
                  <>
                    <img src={formData.coverImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button variant="ghost" className="text-white font-bold" onClick={() => setFormData({...formData, coverImage: ''})}>Trocar Imagem</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground/30" />
                    <span className="text-xs font-bold text-muted-foreground">Arraste ou clique</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                    <div className="w-full bg-muted rounded-full h-1.5 max-w-[150px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="bg-accent h-full rounded-full" 
                      />
                    </div>
                    <span className="text-[10px] font-black text-accent mt-2">{Math.round(uploadProgress)}%</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Recomendado: 1200x630px (máx 2MB)</p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
