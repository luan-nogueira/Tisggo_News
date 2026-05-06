import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function ArticleForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { data: categories } = trpc.categories.list.useQuery();
  
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    categoryId: 0,
    author: "",
    coverImage: "",
    published: false,
  });
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
      navigate("/admin");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar artigo");
    },
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Artigo atualizado com sucesso!");
      navigate("/admin");
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">{id ? "Editar Artigo" : "Novo Artigo"}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Título *</label>
            <Input
              placeholder="Título do artigo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resumo *</label>
            <Textarea
              placeholder="Resumo breve do artigo"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows={2}
              required
            />
          </div>

          <div className="pb-12">
            <label className="block text-sm font-medium mb-2">Conteúdo *</label>
            <div className="bg-white text-black rounded-md overflow-hidden">
              <ReactQuill 
                theme="snow"
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
                className="h-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Categoria *</label>
              <Select value={formData.categoryId.toString()} onValueChange={(val) => setFormData({ ...formData, categoryId: parseInt(val) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Autor *</label>
              <Input
                placeholder="Nome do autor"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Imagem de Capa *</label>
            <div className="space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              
              {isUploading && (
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {formData.coverImage && !isUploading && (
                <div className="mt-4 relative rounded-lg overflow-hidden border border-gray-800 h-48 bg-gray-900 flex items-center justify-center">
                  <img src={formData.coverImage} alt="Capa" className="max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="published" className="text-sm font-medium">
              Publicar agora
            </label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {id ? "Atualizar Artigo" : "Criar Artigo"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
