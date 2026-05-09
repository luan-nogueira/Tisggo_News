import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminCategories() {
  const { data: categories, isLoading, refetch } = trpc.categories.list.useQuery();
  const deleteMutation = trpc.categories.delete.useMutation();

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta categoria? Isso pode afetar os artigos vinculados a ela.")) {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch (error) {
        console.error("Erro ao deletar categoria:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
        <Button className="gap-2" onClick={() => alert("Criação de categorias em breve!")}>
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando categorias...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-900 border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + "20" }}
                  >
                    {category.icon || "📰"}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => alert("Edição em breve!")}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(category.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1 text-white">{category.name}</h3>
                <p className="text-sm text-gray-400 mb-3">
                  {category.description || "Sem descrição"}
                </p>
                <div className="text-xs text-gray-500">
                  Slug: <code className="bg-gray-800 px-2 py-1 rounded text-accent">{category.slug}</code>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
