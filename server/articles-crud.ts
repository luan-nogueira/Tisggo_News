import { z } from "zod";
import { getDb } from "./db";
import { articles as articlesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const createArticleSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  excerpt: z.string().min(10, "Resumo deve ter pelo menos 10 caracteres"),
  content: z.string().min(50, "Conteúdo deve ter pelo menos 50 caracteres"),
  categoryId: z.number().positive(),
  author: z.string().min(2),
  coverImage: z.string().optional(),
  published: z.boolean().default(false),
});

export const updateArticleSchema = createArticleSchema.extend({
  id: z.number().positive(),
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let slug = generateSlug(data.title);
  const randomStr = Math.random().toString(36).substring(2, 8);
  slug = `${slug}-${randomStr}`;

  const result = await db.insert(articlesTable).values({
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    categoryId: data.categoryId,
    author: data.author,
    coverImage: data.coverImage || null,
    slug,
    published: data.published,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: data.published ? new Date() : null,
  });

  return result;
}

export async function updateArticle(data: z.infer<typeof updateArticleSchema>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Keep existing slug to prevent breaking links, or you could update it if needed.
  // For safety, we only update other fields and leave slug intact.
  await db
    .update(articlesTable)
    .set({
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      categoryId: data.categoryId,
      author: data.author,
      coverImage: data.coverImage || null,
      published: data.published,
      updatedAt: new Date(),
      publishedAt: data.published ? new Date() : null,
    })
    .where(eq(articlesTable.id, data.id));

  return { success: true };
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(articlesTable).where(eq(articlesTable.id, id));

  return { success: true };
}
