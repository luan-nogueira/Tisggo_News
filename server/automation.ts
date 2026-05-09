import { createArticle } from "./articles-crud";
import { getDb } from "./db";
import { categories as categoriesTable, articles as articlesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

import * as cheerio from "cheerio";

/**
 * Service to automate news generation for Campos dos Goytacazes by scraping ururau.com.br
 */
export async function automateNews() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Ensure default categories exist
  const categories = await db.select().from(categoriesTable);
  const getCatId = (name: string) => categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || categories[0]?.id || 1;

  try {
    // Fetch homepage of ururau.com.br
    const res = await fetch("https://www.ururau.com.br/");
    if (!res.ok) throw new Error("Falha ao acessar ururau.com.br");
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Find latest news links
    const links: string[] = [];
    $('a[href*="/noticias/"]').each((i, el) => {
      const href = $(el).attr('href');
      // Only get specific article pages (ending with a number id)
      if (href && href.match(/\/\d+\/$/)) {
        // Only use absolute URLs
        links.push(href.startsWith('http') ? href : `https://www.ururau.com.br${href}`);
      }
    });
    
    // Get 4 unique links
    // Process articles in parallel to avoid timeouts (limit to 3 for safety)
    const uniqueLinks = [...new Set(links)].slice(0, 3);
    
    const articlePromises = uniqueLinks.map(async (link) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s per article fetch

        const artRes = await fetch(link, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!artRes.ok) return { title: link, status: "error", message: "Falha ao acessar conteúdo" };
        
        const artHtml = await artRes.text();
        const $art = cheerio.load(artHtml);
        
        let title = $art('h1').first().text().trim();
        let excerpt = $art('meta[property="og:description"]').attr('content') || "";
        let coverImage = $art('meta[property="og:image"]').attr('content') || undefined;
        
        $art('script, style, iframe, .adsbygoogle, .banners, .whatsapp-button').remove();
        let contentText = $art('article, .content-article, .post-content, .texto-materia').html();
        if (!contentText) {
           contentText = $art('p').map((i, el) => `<p>${$art(el).text().trim()}</p>`).get().join('\n');
        } else {
           contentText = contentText.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
        }

        const watermarks = [
          /Foto:\s*Ururau/gi, /Fonte:\s*Portal\s*Ururau/gi, /Fonte:\s*Ururau/gi,
          /Portal\s*Ururau/gi, /ururau\.com\.br/gi, /Ururau/gi, /Reprodução/gi
        ];

        let cleanContent = contentText || "";
        for (const regex of watermarks) {
          cleanContent = cleanContent.replace(regex, "");
          title = title.replace(regex, "");
          excerpt = excerpt.replace(regex, "");
        }
        
        let categoryName = "Geral";
        if (link.includes("/cidades/")) categoryName = "Cidades";
        else if (link.includes("/politica/")) categoryName = "Política";
        else if (link.includes("/policia/")) categoryName = "Polícia";
        else if (link.includes("/economia/")) categoryName = "Economia";
        else if (link.includes("/esportes/")) categoryName = "Esportes";
        
        if (!title || title.length < 5) return { title: link, status: "skipped (short title)" };
        if (!cleanContent || cleanContent.length < 50) return { title: link, status: "skipped (short content)" };

        const existing = await db.select().from(articlesTable).where(eq(articlesTable.title, title)).limit(1);
        if (existing.length > 0) return { title, status: "skipped (already exists)" };

        await createArticle({
          title,
          excerpt: excerpt.substring(0, 250),
          content: cleanContent,
          author: "Equipe Editorial",
          categoryId: getCatId(categoryName),
          coverImage,
          published: true,
        });
        
        return { title, status: "success" };
      } catch (error: any) {
        return { title: link, status: "error", message: error.message };
      }
    });

    const results = await Promise.all(articlePromises);
    return results;
  } catch (globalError: any) {
    console.error("Global automation error:", globalError);
    throw new Error("Falha na automação: " + globalError.message);
  }
}
