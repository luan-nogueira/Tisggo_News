import { z } from "zod";
import * as db from "./db.js";

export const createArticleSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  excerpt: z.string().min(10, "Resumo deve ter pelo menos 10 caracteres"),
  content: z.string().min(50, "Conteúdo deve ter pelo menos 50 caracteres"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  author: z.string().min(2),
  coverImage: z.string().optional(),
  sourceUrl: z.string().optional(),
  published: z.boolean().default(false),
});

export const updateArticleSchema = createArticleSchema.extend({
  id: z.string(),
});

function generateSlug(title: string) {
  const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

export async function createArticle(data: z.infer<typeof createArticleSchema>) {
  try {
    console.log("[CRUD] Attempting to create article:", data.title);
    let slug = generateSlug(data.title);
    const randomStr = Math.random().toString(36).substring(2, 8);
    slug = `${slug}-${randomStr}`;

    const result = await db.createArticle({
      ...data,
      slug,
    });
    console.log("[CRUD] Article created successfully");
    return result;
  } catch (error: any) {
    console.error("[CRUD] Error creating article:", error.message);
    throw error;
  }
}

export async function updateArticle(data: z.infer<typeof updateArticleSchema>) {
  try {
    console.log("[CRUD] Attempting to update article:", data.id);
    const { id, ...articleData } = data;
    // Marca como categorizado manualmente para proteger da recategorização automática
    await db.updateArticle(id, { ...articleData, manualCategory: true });
    console.log("[CRUD] Article updated successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[CRUD] Error updating article:", error.message);
    throw error;
  }
}

export async function deleteArticle(id: string) {
  try {
    const article = await db.getArticleById(id);
    if (article?.sourceUrl) {
      await db.blacklistUrl(article.sourceUrl);
    }
    await db.deleteArticle(id);
    return { success: true };
  } catch (error: any) {
    console.error("[CRUD] Error deleting article:", error.message);
    throw error;
  }
}
