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
  const { data: existingArticle, isLoading: articleLoading } = trpc.articles.get.useQuery(parseInt(id || "0"), { enabled: !!id });
  
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    categoryId: 0,
    author: "",
    coverImage: "",
    published: false,
  });

  useEffect(() => {
    if (existingArticle) {
      setFormData({
        title: existingArticle.title,
        excerpt: existingArticle.excerpt || "",
        content: existingArticle.content,
        categoryId: existingArticle.categoryId,
        author: existingArticle.author,
        coverImage: existingArticle.coverImage || "",
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
        id: parseInt(id),
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/admin/articles")}
            className="rounded-2xl border-white/10 hover:bg-white/5 w-12 h-12"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">
              {id ? "Editar Notícia" : "Nova Publicação"}
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              {id ? "Ajuste os detalhes da sua notícia" : "Crie um novo conteúdo de impacto para o Tisgo News"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/articles")}
            className="rounded-2xl px-6 font-bold text-gray-400 hover:text-white"
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-[#0A0A0A] border-white/5 rounded-[32px] overflow-hidden p-8 space-y-8">
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
                  className="bg-transparent border-none text-3xl font-black p-0 h-auto focus-visible:ring-0 placeholder:text-gray-800 text-white"
                  required
                />
                <Textarea
                  placeholder="Um breve resumo que chame a atenção do leitor..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="bg-white/5 border-white/5 rounded-2xl p-4 text-gray-300 resize-none h-24 focus:border-accent/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-accent">
                <Layout className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Conteúdo do Artigo</span>
              </div>
              
              <div className="bg-white rounded-3xl overflow-hidden min-h-[400px]">
                <ReactQuill 
                  theme="snow"
                  value={formData.content}
                  onChange={(val) => setFormData({ ...formData, content: val })}
                  placeholder="Escreva aqui o corpo da sua notícia..."
                  className="h-[350px] text-black"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">
          {/* Metadata Card */}
          <Card className="bg-[#0A0A0A] border-white/5 rounded-[32px] p-6 space-y-6">
            <div className="flex items-center gap-2 text-accent">
              <Settings className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Configurações</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Categoria</label>
                <Select value={formData.categoryId.toString()} onValueChange={(val) => setFormData({ ...formData, categoryId: parseInt(val) })}>
                  <SelectTrigger className="bg-white/5 border-white/5 rounded-2xl h-12">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-2xl">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} className="focus:bg-white/5 rounded-xl">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Autor</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Nome do autor"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="bg-white/5 border-white/5 rounded-2xl h-12 pl-12"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Publicar</span>
                  <span className="text-[10px] text-gray-500">Visível no site imediatamente</span>
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
          <Card className="bg-[#0A0A0A] border-white/5 rounded-[32px] p-6 space-y-6">
            <div className="flex items-center gap-2 text-accent">
              <ImageIcon className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Capa da Notícia</span>
            </div>

            <div className="space-y-4">
              <div 
                className={`relative group h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden
                  ${formData.coverImage ? 'border-accent/30' : 'border-white/10 hover:border-accent/50'}`}
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
                    <Upload className="w-8 h-8 text-gray-700" />
                    <span className="text-xs font-bold text-gray-500">Arraste ou clique</span>
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
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                    <div className="w-full bg-white/10 rounded-full h-1.5 max-w-[150px]">
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
              <p className="text-[10px] text-center text-gray-500">Recomendado: 1200x630px (máx 2MB)</p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
