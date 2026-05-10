import * as db from "./db.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import https from "https";
import { createArticle } from "./articles-crud.js";

const agent = new https.Agent({
  rejectUnauthorized: false
});

const SOURCES = [
  {
    name: "GE Globo",
    url: "https://ge.globo.com/",
    linkSelector: 'a[href*=".ghtml"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container',
    baseUrl: "https://ge.globo.com"
  },
  {
    name: "g1 Norte Fluminense",
    url: "https://g1.globo.com/rj/norte-fluminense/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container, .content-text',
    baseUrl: "https://g1.globo.com"
  },
  {
    name: "Ururau",
    url: "https://www.ururau.com.br/noticias/cidades/",
    linkSelector: "h3.post-title a",
    titleSelector: "h1.post-title",
    contentSelector: ".entry-content",
    baseUrl: "https://www.ururau.com.br"
  }
];

const FORBIDDEN_WORDS = [
  /ururau\.com\.br/gi, /camposocorrencias\.com\.br/gi, /Globo\.com/gi, /GE\.com/gi, /ge\.globo/gi,
  /Reprodução/gi, /Foto:\s*[^<]*/gi, /Fonte:\s*[^<]*/gi, /Imagens:\s*[^<]*/gi,
  /Leia também:[^<]*/gi, /Veja também:[^<]*/gi, /Clique aqui[^<]*/gi,
  /Siga o g1[^<]*/gi, /Siga o canal.*?no WhatsApp/gi
];

function cleanText(text: string): string {
  let cleaned = text;
  for (const regex of FORBIDDEN_WORDS) {
    cleaned = cleaned.replace(regex, "");
  }
  return cleaned.trim();
}

export async function automateNews(limitPerSource = 2) {
  console.log("[Automation] Starting news fetch (Vercel Optimized Mode)...");
  const stats = { added: 0, skipped: 0, errors: 0 };
  
  try {
    const categories = await db.getCategories();
    if (categories.length === 0) {
      throw new Error("No categories found. Create categories first.");
    }

    for (const source of SOURCES) {
      console.log(`[Automation] Scraping: ${source.name}`);
      try {
        const res = await fetch(source.url, { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000 
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const links: string[] = [];

        $(source.linkSelector).each((i, el) => {
          let href = $(el).attr('href');
          if (href) {
            if (!href.startsWith('http')) href = source.baseUrl + (href.startsWith('/') ? '' : '/') + href;
            links.push(href);
          }
        });

        const uniqueLinks = [...new Set(links)].slice(0, limitPerSource);
        
        for (const link of uniqueLinks) {
          try {
            const artRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);
            
            const title = cleanText($art(source.titleSelector).first().text());
            if (!title || title.length < 15) continue;

            const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
            const existing = await db.getArticleBySlug(slug);
            if (existing) {
              stats.skipped++;
              continue;
            }

            let content = "";
            $art(source.contentSelector).find('p').each((i, p) => {
              const text = cleanText($(p).text());
              if (text.length > 40) content += `<p>${text}</p>\n`;
            });

            if (content.length < 200) continue;

            const coverImage = $art('meta[property="og:image"]').attr('content') || "";
            
            await createArticle({
              title,
              slug,
              excerpt: content.substring(0, 200).replace(/<[^>]*>/g, ""),
              content,
              author: "Equipe Editorial",
              categoryId: categories[0].id,
              coverImage,
              sourceUrl: link,
              publishedAt: new Date().toISOString(),
              published: true,
            });
            stats.added++;
          } catch (e) {
            console.error(`[Automation] Error on link ${link}:`, e);
          }
        }
      } catch (sourceError: any) {
        console.error(`[Automation] Error on source ${source.name}:`, sourceError.message);
        stats.errors++;
      }
    }

    return { 
      success: true, 
      message: `Concluído: ${stats.added} novas, ${stats.skipped} puladas.`,
      stats 
    };
  } catch (error: any) {
    console.error("[Automation] Global Error:", error.message);
    throw error;
  }
}

export async function checkAndRunAutomation() {
  // Not used in serverless/manual mode for now to avoid crashes
}
