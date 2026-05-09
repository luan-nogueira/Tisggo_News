import * as db from "./db";
import * as cheerio from "cheerio";

/**
 * Service to automate news generation for Campos dos Goytacazes by scraping ururau.com.br
 */
export async function automateNews() {
  // Ensure default categories exist
  const categories = await db.getCategories();
  const getCatId = (name: string) => categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || categories[0]?.id || "default";

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
      if (href && href.match(/\/\d+\/$/)) {
        links.push(href.startsWith('http') ? href : `https://www.ururau.com.br${href}`);
      }
    });
    
    const uniqueLinks = [...new Set(links)].slice(0, 3);
    
    const articlePromises = uniqueLinks.map(async (link) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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

        // Check if article already exists in Firestore by title
        const existing = await db.getArticleBySlug(title.toLowerCase().replace(/\s+/g, '-'));
        if (existing) return { title, status: "skipped (already exists)" };

        await db.createArticle({
          title,
          excerpt: excerpt.substring(0, 250),
          content: cleanContent,
          author: "Equipe Editorial",
          categoryId: getCatId(categoryName),
          coverImage,
          publishedAt: new Date(),
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
