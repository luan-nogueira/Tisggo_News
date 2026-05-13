import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Edit2, Instagram, MessageCircle, ExternalLink, Zap, Crop, Layout } from "lucide-react";
import { toast } from "sonner";
import { MediaCropDialog } from "@/components/MediaCropDialog";

export default function AdminSponsors() {
  const utils = trpc.useUtils();
  const { data: sponsors, isLoading } = trpc.sponsors.list.useQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [currentSponsor, setCurrentSponsor] = useState<any>(null);

  const upsertMutation = trpc.sponsors.upsert.useMutation({
    onSuccess: () => {
      utils.sponsors.list.invalidate();
      setIsEditing(false);
      setCurrentSponsor(null);
      toast.success("Patrocinador salvo com sucesso!");
    },
    onError: (err) => {
      console.error("Erro ao salvar patrocinador:", err);
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  });

  const deleteMutation = trpc.sponsors.delete.useMutation({
    onSuccess: () => {
      utils.sponsors.list.invalidate();
      toast.success("Patrocinador removido!");
    }
  });

  const [formState, setFormState] = useState({
    name: "",
    image: "",
    location: "",
    whatsapp: "",
    instagram: ""
  });

  // Sync state when editing
  useEffect(() => {
    if (currentSponsor) {
      setFormState({
        name: currentSponsor.name,
        image: currentSponsor.image,
        location: currentSponsor.location,
        whatsapp: currentSponsor.whatsapp || "",
        instagram: currentSponsor.instagram || ""
      });
    } else {
      setFormState({ name: "", image: "", location: "", whatsapp: "", instagram: "" });
    }
  }, [currentSponsor]);

  const [isCropping, setIsCropping] = useState(false);
  const [tempMedia, setTempMedia] = useState<{ url: string, type: 'image' | 'video', name: string } | null>(null);

  const getAspectRatio = () => {
    switch (formState.location) {
      case 'sidebar': return 1;
      case 'horizontal_bottom': return 16 / 4;
      case 'horizontal_middle': return 16 / 5;
      case 'top_banner': return 21 / 5;
      default: return 1;
    }
  };

  const uploadMutation = trpc.sponsors.uploadImage.useMutation({
    onSuccess: (data) => {
      toast.success("Mídia carregada com sucesso!");
      setFormState(prev => ({ ...prev, image: data.url }));
    },
    onError: (err) => {
      console.error("Erro no upload:", err);
      toast.error(`Falha no upload: ${err.message || "Verifique o tamanho do arquivo (máx 100MB)"}`);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempMedia({ 
        url: reader.result as string, 
        type, 
        name: file.name 
      });
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (finalMedia: string) => {
    if (!tempMedia) return;
    
    uploadMutation.mutate({
      base64: finalMedia,
      fileName: tempMedia.name,
      contentType: tempMedia.type === 'video' ? 'video/mp4' : 'image/jpeg'
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.name || !formState.image) {
      toast.error("Preencha o nome e a imagem!");
      return;
    }
    if (!formState.location) {
      toast.error("Selecione a Localização no Site!");
      return;
    }

    upsertMutation.mutate({
      id: currentSponsor?.id,
      name: formState.name,
      image: formState.image,
      location: formState.location,
      whatsapp: formState.whatsapp || "",
      instagram: formState.instagram || "",
      active: true
    });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">Patrocinadores</h2>
          <p className="text-muted-foreground text-sm">Gerencie os anúncios e parceiros do portal.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => { 
            setIsEditing(true); 
            setCurrentSponsor(null);
            setFormState({ name: "", image: "", location: "", whatsapp: "", instagram: "" });
          }} className="bg-accent text-black font-bold w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Novo Patrocinador
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'top_banner', name: 'Home - Topo Principal', icon: Crop },
          { id: 'horizontal_middle', name: 'Home - Meio Principal', icon: Zap },
          { id: 'home_sports', name: 'Home - Sessão Esportes', icon: Layout },
          { id: 'horizontal_bottom', name: 'Home - Rodapé', icon: ExternalLink },
          { id: 'sidebar', name: 'Home - Barra Lateral', icon: Layout },
          { id: 'article_top', name: 'Notícia - Topo', icon: Crop },
          { id: 'article_sidebar', name: 'Notícia - Meio', icon: Layout },
          { id: 'article_bottom', name: 'Notícia - Rodapé', icon: ExternalLink }
        ].map(slot => {
          const slotSponsors = sponsors?.filter((s: any) => s.location === slot.id && s.active) || [];
          const count = slotSponsors.length;
          return (
            <Card key={slot.id} className={`border-2 transition-all ${count > 0 ? 'border-accent/20 bg-accent/5' : 'border-dashed border-muted bg-transparent'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${count > 0 ? 'bg-accent text-black' : 'bg-muted text-muted-foreground'}`}>
                  <slot.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate" title={slot.name}>{slot.name}</p>
                  <p className={`text-[10px] font-bold ${count > 0 ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {count === 0 ? 'Disponível' : `${count} Patrocinador${count > 1 ? 'es' : ''}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isEditing ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{currentSponsor ? "Editar" : "Novo"} Patrocinador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome da Empresa</Label>
                  <Input 
                    value={formState.name} 
                    onChange={e => setFormState(p => ({ ...p, name: e.target.value }))}
                    className="bg-muted border-border text-foreground" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Banner / Imagem</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formState.image} 
                      onChange={e => setFormState(p => ({ ...p, image: e.target.value }))}
                      className="bg-muted border-border text-foreground flex-1" 
                      required 
                      placeholder="URL ou carregue um arquivo..." 
                    />
                    <Button 
                      type="button" 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="bg-muted border-border text-foreground hover:bg-muted/80"
                    >
                      {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Galeria
                    </Button>
                    <input 
                      id="file-upload" 
                      type="file" 
                      accept="image/*,video/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
                <div className="space-y-2 col-span-full">
                  <Label className="text-muted-foreground">Preview do Arquivo</Label>
                  <div className="h-40 bg-muted rounded-xl overflow-hidden flex items-center justify-center border border-border">
                    {formState.image ? (
                      formState.image.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                        <video 
                          src={formState.image} 
                          className="w-full h-full object-cover" 
                          autoPlay 
                          muted 
                          loop 
                        />
                      ) : (
                        <img 
                          src={formState.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Nenhuma mídia selecionada</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Localização no Site</Label>
                  <Select 
                    value={formState.location} 
                    onValueChange={(v: any) => setFormState(p => ({ ...p, location: v }))}
                  >
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Selecione um local..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="top_banner">Home - Topo Principal</SelectItem>
                      <SelectItem value="horizontal_middle">Home - Meio Principal</SelectItem>
                      <SelectItem value="home_sports">Home - Sessão Esportes</SelectItem>
                      <SelectItem value="horizontal_bottom">Home - Rodapé</SelectItem>
                      <SelectItem value="sidebar">Home - Barra Lateral</SelectItem>
                      <SelectItem value="article_top">Notícia - Topo</SelectItem>
                      <SelectItem value="article_sidebar">Notícia - Meio do Texto</SelectItem>
                      <SelectItem value="article_bottom">Notícia - Rodapé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Link WhatsApp (Opcional)</Label>
                  <Input 
                    value={formState.whatsapp} 
                    onChange={e => setFormState(p => ({ ...p, whatsapp: e.target.value }))}
                    className="bg-muted border-border text-foreground" 
                    placeholder="https://wa.me/..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Link Instagram (Opcional)</Label>
                  <Input 
                    value={formState.instagram} 
                    onChange={e => setFormState(p => ({ ...p, instagram: e.target.value }))}
                    className="bg-muted border-border text-foreground" 
                    placeholder="https://instagram.com/..." 
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="submit" disabled={upsertMutation.isPending} className="bg-accent text-black font-bold flex-1 sm:flex-none">
                  {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Patrocinador
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="border-border text-muted-foreground flex-1 sm:flex-none">Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sponsors?.map((sponsor: any) => (
        <Card key={sponsor.id} className="bg-card border-border overflow-hidden group">
          <div className="h-36 bg-gradient-to-br from-background to-muted relative overflow-hidden flex items-center justify-center group">
            {/* Texture overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            
            {sponsor.image ? (
              sponsor.image.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
                <video 
                  src={sponsor.image} 
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110" 
                  autoPlay 
                  muted 
                  loop 
                  playsInline 
                />
              ) : (
                <img 
                  src={sponsor.image} 
                  alt={sponsor.name} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.querySelector('.placeholder')?.classList.remove('hidden');
                  }}
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110" 
                />
              )
            ) : null}

            {/* Premium Placeholder */}
            <div className={`placeholder ${sponsor.image ? 'hidden' : ''} absolute inset-0 flex flex-col items-center justify-center text-accent/20 group-hover:text-accent/40 transition-colors`}>
              <Zap className="w-12 h-12 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Mídia não carregada</span>
            </div>

            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/40 border border-white/10 text-white hover:bg-accent hover:text-black transition-all" onClick={() => { setCurrentSponsor(sponsor); setIsEditing(true); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" className="h-8 w-8 shadow-lg" onClick={() => deleteMutation.mutate(sponsor.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 left-2 z-10">
              <span className="text-[10px] font-black bg-accent text-black px-2 py-0.5 rounded uppercase shadow-lg">
                {sponsor.location.replace('_', ' ')}
              </span>
            </div>
          </div>
          <CardContent className="p-4">
            <h4 className="font-bold text-foreground mb-2">{sponsor.name}</h4>
                <div className="flex gap-4">
                  {sponsor.whatsapp && (
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </div>
                  )}
                  {sponsor.instagram && (
                    <div className="flex items-center gap-1 text-pink-500 text-xs font-bold">
                      <Instagram className="w-3 h-3" /> Instagram
                    </div>
                  )}
                  {!sponsor.whatsapp && !sponsor.instagram && (
                    <span className="text-gray-500 text-xs italic">Sem links sociais</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {sponsors?.length === 0 && (
            <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground font-bold">Nenhum patrocinador cadastrado.</p>
            </div>
          )}
        </div>
      )}

      {tempMedia && (
        <MediaCropDialog
          open={isCropping}
          onOpenChange={setIsCropping}
          mediaUrl={tempMedia.url}
          mediaType={tempMedia.type}
          aspectRatio={getAspectRatio()}
          onCropComplete={onCropComplete}
        />
      )}
    </div>
  );
}
