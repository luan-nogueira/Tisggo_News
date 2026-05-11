import { getDb } from "./db";
import { articles as articlesTable, categories as categoriesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function generateSitemap(baseUrl: string): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const articlesSnap = await db.collection("articles").where("published", "==", true).get();
  const categoriesSnap = await db.collection("categories").get();
  
  const articles = articlesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  // Add category URLs
  categories.forEach((category: any) => {
    sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${new Date(category.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Add article URLs
  articles.forEach((article: any) => {
    sitemap += `
  <url>
    <loc>${baseUrl}/article/${article.slug}</loc>
    <lastmod>${new Date(article.publishedAt || article.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  sitemap += `
</urlset>`;

  return sitemap;
}
