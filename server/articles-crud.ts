import { z } from "zod";
import * as db from "./db";

export const createArticleSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  excerpt: z.string().min(10, "Resumo deve ter pelo menos 10 caracteres"),
  content: z.string().min(50, "Conteúdo deve ter pelo menos 50 caracteres"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  author: z.string().min(2),
  coverImage: z.string().optional(),
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
  let slug = generateSlug(data.title);
  const randomStr = Math.random().toString(36).substring(2, 8);
  slug = `${slug}-${randomStr}`;

  return await db.createArticle({
    ...data,
    slug,
  });
}

export async function updateArticle(data: z.infer<typeof updateArticleSchema>) {
  const { id, ...articleData } = data;
  await db.updateArticle(id, articleData);
  return { success: true };
}

export async function deleteArticle(id: string) {
  await db.deleteArticle(id);
  return { success: true };
}
