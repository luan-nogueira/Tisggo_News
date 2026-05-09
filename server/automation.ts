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
    const results = [];
    
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
    const uniqueLinks = [...new Set(links)].slice(0, 4);
    
    for (const link of uniqueLinks) {
      try {
        console.log(`[Automation] Processing article: ${link}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const artRes = await fetch(link, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!artRes.ok) {
          console.warn(`[Automation] Failed to fetch article content: ${link}`);
          continue;
        }
        const artHtml = await artRes.text();
        const $art = cheerio.load(artHtml);
        
        let title = $art('h1').first().text().trim();
        let excerpt = $art('meta[property="og:description"]').attr('content') || "";
        let coverImage = $art('meta[property="og:image"]').attr('content') || undefined;
        
        // Try to get content (remove scripts, styles, etc)
        $art('script, style, iframe, .adsbygoogle, .banners, .whatsapp-button').remove();
        let contentText = $art('article, .content-article, .post-content, .texto-materia').html();
        if (!contentText) {
           contentText = $art('p').map((i, el) => `<p>${$art(el).text().trim()}</p>`).get().join('\n');
        } else {
           // Basic sanitize: remove links but keep text
           contentText = contentText.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
        }

        // Clean Watermarks
        const watermarks = [
          /Foto:\s*Ururau/gi,
          /Fonte:\s*Portal\s*Ururau/gi,
          /Fonte:\s*Ururau/gi,
          /Portal\s*Ururau/gi,
          /ururau\.com\.br/gi,
          /Ururau/gi,
          /Reprodução/gi
        ];

        let cleanContent = contentText || "";
        for (const regex of watermarks) {
          cleanContent = cleanContent.replace(regex, "");
        }
        
        for (const regex of watermarks) {
          title = title.replace(regex, "");
          excerpt = excerpt.replace(regex, "");
        }
        
        let categoryName = "Geral";
        if (link.includes("/cidades/")) categoryName = "Cidades";
        else if (link.includes("/politica/")) categoryName = "Política";
        else if (link.includes("/policia/")) categoryName = "Polícia";
        else if (link.includes("/economia/")) categoryName = "Economia";
        else if (link.includes("/esportes/")) categoryName = "Esportes";
        else if (link.includes("/estado-rj/")) categoryName = "Estado RJ";
        
        if (!title || title.length < 5) {
          console.warn(`[Automation] Skipping article due to short title: ${link}`);
          continue;
        }
        if (!cleanContent || cleanContent.length < 50) {
          console.warn(`[Automation] Skipping article due to short content: ${link}`);
          continue;
        }

        const existing = await db.select().from(articlesTable).where(eq(articlesTable.title, title)).limit(1);
        if (existing.length > 0) {
          console.log(`[Automation] Article already exists: ${title}`);
          results.push({ title, status: "skipped (already exists)" });
          continue;
        }

        await createArticle({
          title: title,
          excerpt: excerpt.substring(0, 250),
          content: cleanContent,
          author: "Equipe Editorial",
          categoryId: getCatId(categoryName),
          coverImage: coverImage,
          published: true,
        });
        
        console.log(`[Automation] Successfully imported: ${title}`);
        results.push({ title, status: "success" });
      } catch (error: any) {
        console.error(`[Automation] Error processing article ${link}:`, error.message);
        results.push({ title: link, status: "error", message: error.message });
      }
    }

    return results;
  } catch (globalError: any) {
    console.error("Global automation error:", globalError);
    throw new Error("Falha na automação: " + globalError.message);
  }
}
