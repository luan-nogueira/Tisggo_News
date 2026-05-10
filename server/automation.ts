import * as db from "./db.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import https from "https";
import sharp from "sharp";
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
    baseUrl: "https://ge.globo.com",
    category: "Esportes"
  },
  {
    name: "g1 Norte Fluminense",
    url: "https://g1.globo.com/rj/norte-fluminense/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container, .content-text',
    baseUrl: "https://g1.globo.com",
    category: "Geral"
  },
  {
    name: "Ururau",
    url: "https://www.ururau.com.br/noticias/cidades/",
    linkSelector: "h3.post-title a",
    titleSelector: "h1.post-title",
    contentSelector: ".entry-content",
    baseUrl: "https://www.ururau.com.br",
    category: "Cidades"
  },
  {
    name: "Campos Ocorrências",
    url: "https://camposocorrencias.com.br/",
    linkSelector: "article.post a.post-title, .mag-box-container a",
    titleSelector: "h1.single-post-title",
    contentSelector: ".entry-content",
    dateSelector: "time, .post-date",
    baseUrl: "https://camposocorrencias.com.br",
    category: "Polícia"
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

async function processAndUploadImage(imageUrl: string, sourceName: string): Promise<string> {
  try {
    console.log(`[Automation] Processing image from ${sourceName}...`);
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    if (!res.ok) throw new Error("Failed to download image");
    
    const buffer = await res.buffer();
    let pipeline = sharp(buffer);
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.height) {
      // SMART CROP: Cut the bottom 6% of the image to remove watermarks/credits
      const cropHeight = Math.round(metadata.height * 0.94);
      pipeline = pipeline.extract({ left: 0, top: 0, width: metadata.width, height: cropHeight });
      console.log(`[Automation] Smart Crop applied: ${metadata.height}px -> ${cropHeight}px`);
    }

    // Convert to optimized WebP
    const processedBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
    const fileName = `${sourceName.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.webp`;
    
    return await db.uploadImageToStorage(processedBuffer, fileName, "image/webp");
  } catch (error: any) {
    console.error(`[Automation] Image processing failed for ${imageUrl}:`, error.message);
    return imageUrl; // Fallback
  }
}

export async function automateNews(limitPerSource = 2) {
  console.log("[Automation] Starting news fetch with Smart Image Processing...");
  const stats = { added: 0, skipped: 0, errors: 0 };
  
  try {
    let categories = await db.getCategories();
    
    // Ensure essential categories exist
    const requiredCategories = ["Geral", "Esportes", "Cidades", "Polícia"];
    for (const catName of requiredCategories) {
      if (!categories.find(c => c.name === catName)) {
        console.log(`[Automation] Creating missing category: ${catName}`);
        await db.createCategory({
          name: catName,
          slug: catName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
          description: `Notícias de ${catName}`,
          color: catName === "Esportes" ? "#22c55e" : "#fbbf24"
        });
      }
    }
    // Refresh categories after potential creation
    categories = await db.getCategories();

    for (const source of SOURCES) {
      console.log(`[Automation] Scraping: ${source.name}`);
      try {
        const res = await fetch(source.url, { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000 
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
            const artRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
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

            // Check if article is from 2026 or later
            const lowerTitle = title.toLowerCase();
            const lowerContent = content.toLowerCase();
            const isOld = link.includes("/2025/") || link.includes("/2024/") || 
                          lowerTitle.includes("2025") || lowerTitle.includes("2024") || 
                          lowerContent.includes("julho de 2025") || lowerContent.includes("julho de 2024");
            
            if (isOld) {
              console.log(`[Automation] Skipping old article: ${title}`);
              stats.skipped++;
              continue;
            }

            const ogImage = $art('meta[property="og:image"]').attr('content') || "";
            let finalImageUrl = ogImage;
            
            // Process image to remove watermarks if it's from a known source
            if (ogImage) {
              finalImageUrl = await processAndUploadImage(ogImage, source.name);
            }

            // SMART CATEGORIZATION LOGIC
            let targetCategoryName = source.category;
            
            // Keyword-based override for better accuracy
            const lowerTitle = title.toLowerCase();
            const lowerContent = content.toLowerCase();
            
            if (lowerTitle.includes("futebol") || lowerTitle.includes("jogo") || lowerTitle.includes("flamengo") || 
                lowerTitle.includes("vasco") || lowerTitle.includes("botafogo") || lowerTitle.includes("fluminense") ||
                lowerTitle.includes("campeonato") || lowerTitle.includes("brasileirao")) {
              targetCategoryName = "Esportes";
            } else if (lowerTitle.includes("preso") || lowerTitle.includes("crime") || lowerTitle.includes("policia") || 
                       lowerTitle.includes("assalto") || lowerTitle.includes("tiroteio") || lowerTitle.includes("trafico")) {
              targetCategoryName = "Polícia";
            }

            const sourceCategory = categories.find(c => 
              c.name.toLowerCase() === targetCategoryName.toLowerCase() ||
              c.name.toLowerCase().includes(targetCategoryName.toLowerCase())
            ) || categories.find(c => c.name === "Geral") || categories[0];
            
            // Extract original publication date if available
            let publishedAt = new Date().toISOString();
            if (source.dateSelector) {
              const rawDate = $art(source.dateSelector).attr('datetime') || $art(source.dateSelector).first().text();
              if (rawDate) {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) {
                  publishedAt = parsed.toISOString();
                } else {
                  // Try to parse BR date format DD/MM/YYYY
                  const match = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                  if (match) {
                    publishedAt = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])).toISOString();
                  }
                }
              }
            }

            await createArticle({
              title,
              slug,
              excerpt: content.substring(0, 200).replace(/<[^>]*>/g, ""),
              content,
              author: "Equipe Tisggo",
              categoryId: sourceCategory.id,
              coverImage: finalImageUrl,
              sourceUrl: link,
              publishedAt,
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

export async function cleanupExistingArticles() {
  console.log("[Automation] Running 7-day cleanup...");
  try {
    const dbInstance = db.getDb();
    if ((dbInstance as any).error) throw new Error("DB not initialized");
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const snapshot = await dbInstance.collection("articles")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
      
    console.log(`[Automation] Found ${snapshot.size} old articles to delete.`);
    
    let deletedCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Safety check: only delete if it's actually old or from previous years
      const lowerTitle = (data.title || "").toLowerCase();
      const isActuallyOld = lowerTitle.includes("2025") || lowerTitle.includes("2024") || 
                            lowerTitle.includes("julho de 2025") || lowerTitle.includes("julho de 2024");
      
      // If it's more than 7 days old OR it's from 2025/2024, delete it
      // The snapshot already filtered by 7 days, so we just add the extra year check for absolute certainty
      
      // 1. Delete image from storage if it's our hosted image
      if (data.coverImage) {
        await db.deleteFromStorage(data.coverImage);
      }
      
      // 2. Delete article from firestore
      await doc.ref.delete();
      deletedCount++;
    }
    
    return { success: true, deleted: deletedCount };
  } catch (error: any) {
    console.error("[Automation] Cleanup Error:", error.message);
    return { success: false, error: error.message };
  }
}

import admin from "firebase-admin";
