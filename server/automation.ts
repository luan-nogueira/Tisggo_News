import * as db from "./db.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import https from "https";
import { createArticle } from "./articles-crud.js";

const agent = new https.Agent({
  rejectUnauthorized: false
});

// Limpa notícias com mais de 7 dias
async function cleanupOldArticles() {
  try {
    const firestore = await db.getDb();
    const settingsDoc = await firestore.collection("settings").doc("automation").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { autoCleanup: true };
    if (!settings?.autoCleanup) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot = await firestore.collection("articles")
      .where("createdAt", "<", sevenDaysAgo.toISOString())
      .get();

    if (snapshot.empty) return;
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[Faxina] ${snapshot.size} notícias antigas removidas.`);
  } catch (error) {
    console.error("[Faxina] Erro:", error);
  }
}

interface NewsSource {
  name: string;
  url: string;
  linkSelector: string;
  titleSelector: string;
  contentSelector: string;
  imageSelector?: string;
  baseUrl: string;
}

const SOURCES: NewsSource[] = [
  {
    name: "GE Globo",
    url: "https://ge.globo.com/",
    linkSelector: 'a[href*=".ghtml"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://ge.globo.com"
  },
  {
    name: "g1 Norte Fluminense",
    url: "https://g1.globo.com/rj/norte-fluminense/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container, .content-text',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://g1.globo.com"
  },
  {
    name: "Ururau",
    url: "https://www.ururau.com.br/noticias/cidades/",
    linkSelector: "h3.post-title a",
    titleSelector: "h1.post-title",
    contentSelector: ".entry-content",
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.ururau.com.br"
  },
  {
    name: "Campos Ocorrências",
    url: "https://camposocorrencias.com.br/",
    linkSelector: 'a',
    titleSelector: 'h1, .entry-title',
    contentSelector: '.elementor-widget-theme-post-content, .entry-content, article',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://camposocorrencias.com.br"
  }
];

const PORTAL_MAPPINGS = [
  // Grammatical variations for Ururau
  { regex: /O Ururau/gi, replacement: "O Tisggo News" },
  { regex: /A Ururau/gi, replacement: "A nossa redação" },
  { regex: /do Ururau/gi, replacement: "do Tisggo News" },
  { regex: /no Ururau/gi, replacement: "no Tisggo News" },
  { regex: /pelo Ururau/gi, replacement: "pela nossa equipe" },
  { regex: /Portal Ururau/gi, replacement: "Tisggo News" },
  { regex: /Ururau/gi, replacement: "Tisggo News" },
  
  // Variations for other sources
  { regex: /Campos Ocorrências/gi, replacement: "nossa equipe" },
  { regex: /Globo Esporte/gi, replacement: "esporte" },
  { regex: /g1 Norte Fluminense/gi, replacement: "notícias locais" },
  { regex: /NF Notícias/gi, replacement: "notícias" },

  // Grammar & Space Fixes (Cleanup)
  { regex: /O\s+teve acesso/gi, replacement: "O Tisggo News teve acesso" },
  { regex: /\s{2,}/g, replacement: " " }
];

const FORBIDDEN_WORDS = [
  // URLs
  /ururau\.com\.br/gi, /camposocorrencias\.com\.br/gi, /campos\.rj\.gov\.br/gi,
  /Globo\.com/gi, /GE\.com/gi, /ge\.globo/gi,
  
  // Credits & Metadata
  /Reprodução/gi, /Foto:\s*[^<]*/gi, /Fonte:\s*[^<]*/gi, /Imagens:\s*[^<]*/gi,
  /Créditos:\s*[^<]*/gi, /Crédito:\s*[^<]*/gi, /Arquivo pessoal/gi,
  
  // Calls to Action
  /Leia também:[^<]*/gi, /Confira abaixo:[^<]*/gi, /Clique aqui[^<]*/gi,
  /Inscreva-se no canal[^<]*/gi, /Siga o g1[^<]*/gi, /Siga no Instagram[^<]*/gi,
  /Siga o canal.*?no WhatsApp/gi, /📱[^<]*/gi, /Acompanhe em tempo real[^<]*/gi,
  /Veja também:[^<]*/gi, /LEIA TAMBÉM:[^<]*/gi, /ASSISTA:[^<]*/gi,
  /Participe do grupo[^<]*/gi, /Receba notícias[^<]*/gi,
  
  // Legal & Contact
  /Aviso\s+importante:?\s+a\s+total\s+ou\s+parcial\s+de\s+qualquer\s+conteúdo.*?esfera\s+judicial\.?/gi,
  /Aviso\s+importante:?\s+a\s+total\s+ou\s+parcial[^.]*/gi,
  /reproduzir\s+nosso\s+conteúdo,?\s+entre\s+em\s+contato[^.]*/gi,
  /comercial@[^.]*/gi, /Todos os direitos reservados/gi,
  /Copyright[^<]*/gi, /©[^<]*/gi,
  /Se\s+você\s+possui\s+um\s+blog\s+ou\s+site\s+e\s+deseja\s+estabelecer\s+uma\s+parceria[^<]*/gi,
  
  // Journalistic Signatures
  /Por\s+[^,.]*,/gi, /Reportagem de\s+[^<]*/gi, /Texto:\s+[^<]*/gi,
  /Colaboração para o[^<]*/gi, /Editado por[^<]*/gi
];

function cleanAndBrandText(text: string, isTitle: boolean = false): string {
  let cleaned = text;
  
  // 1. Apply branding mappings
  for (const map of PORTAL_MAPPINGS) {
    cleaned = cleaned.replace(map.regex, map.replacement);
  }
  
  // 2. Remove forbidden patterns
  for (const regex of FORBIDDEN_WORDS) {
    cleaned = cleaned.replace(regex, "");
  }
  
  // 3. Remove signature lines at the beginning (e.g. "Tisggo News - 09/05/2024")
  if (!isTitle) {
    cleaned = cleaned.replace(/^Tisggo News\s*-\s*\d{2}\/\d{2}\/\d{4}\s*/i, "");
    cleaned = cleaned.replace(/Por\s+(?:Redação do\s+)?g1\s+.*?—\s+.*?(\n|$)/gi, "");
    cleaned = cleaned.replace(/Por\s+(?:Redação do\s+)?ge\s+.*?—\s+.*?(\n|$)/gi, "");
    cleaned = cleaned.replace(/colaboração\s+para\s+o\s+ge/gi, "nossa equipe de esportes");
  }

  return cleaned.trim();
}

async function getOrCreateCategory(name: string) {
  const categories = await db.getCategories();
  const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const newCat = await db.createCategory({ name, slug });
  return newCat.id;
}

const getUnsplashFallback = (query: string) => {
  const fallbacks = [
    "photo-1504711434969-e33886168f5c", // Newspaper
    "photo-1585829365234-781fcd04c838", // Digital news
    "photo-1495020689067-958852a7765e", // News desk
    "photo-1504467339174-609ec8853b53", // City view
    "photo-1450101499163-c8848c66ca85", // Documents/Legal
    "photo-1461896756984-750d437021e8", // Sports field
    "photo-1526628953301-3e589a6a8b74", // Economy/Charts
    "photo-1485827404703-89b55fcc595e", // Tech
    "photo-1444653303775-950c0800fa44"  // Abstract city
  ];
  const randomId = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return `https://images.unsplash.com/public-3/${randomId}?w=800&q=80&auto=format&fit=crop`;
};

const isSuspiciousImage = (url: string) => {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  return (
    /logo|banner|header|brand|placeholder|default|background|campanha|graphic|arte/i.test(lowerUrl) || 
    lowerUrl.includes('ururau-noticias') || 
    lowerUrl.includes('noticia-urbana') ||
    lowerUrl.includes('campos-ocorrencias') ||
    (lowerUrl.includes('ururau') && !lowerUrl.includes('fotos/') && !lowerUrl.includes('img/noticias/'))
  );
};

export async function automateNews() {
  console.log("[Robô] Verificando fontes...");
  try {
    await cleanupOldArticles();
    const results: any[] = [];

    for (const source of SOURCES) {
      try {
        console.log(`[Automation] Scraping source: ${source.name}`);
        const res = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (!res.ok) continue;
        
        const html = await res.text();
        const $ = cheerio.load(html);
        const links: string[] = [];

        $(source.linkSelector).each((i, el) => {
          let href = $(el).attr('href');
          if (href) {
            if (!href.startsWith('http')) href = source.baseUrl + (href.startsWith('/') ? '' : '/') + href;
            if (source.name === "Ururau" && !href.match(/\/\d+\/$/)) return;
            if ((source.name === "GE Globo" || source.name === "g1 Norte Fluminense") && !href.includes(".ghtml")) return;
            if (source.name === "Campos Ocorrências" && !href.match(/\/\d{4}\/\d{2}\/\d{2}\//)) return;
            links.push(href);
          }
        });

        console.log(`[Automation] Found ${links.length} valid links for ${source.name}`);

        const fetchLimit = source.name === "GE Globo" ? 25 : 8;
        const uniqueLinks = [...new Set(links)].slice(0, fetchLimit); 

        for (const link of uniqueLinks) {
          try {
            const artRes = await fetch(link, {
              agent,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            if (!artRes.ok) continue;
            
            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);
            
            let title = $art(source.titleSelector).first().text().trim();
            if (!title || title.length < 20 || title.includes("Autor:") || title.includes("Destaque")) continue;

            // --- Real Date Extraction & Freshness Check ---
            let publishedAt = new Date();
            const dateStr = $art('time[itemprop="datePublished"]').attr('datetime') || 
                            $art('meta[property="article:published_time"]').attr('content');
            
            if (dateStr) {
              publishedAt = new Date(dateStr);
              const diffHours = (new Date().getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
              
              // If article is older than 48 hours, skip it
              if (diffHours > 48) {
                console.log(`[Automation] Skipping old article (${Math.round(diffHours)}h): ${title}`);
                continue;
              }
            } else if (source.name === "GE Globo" || source.name === "g1 Norte Fluminense") {
              // Globo sites always have dates. If not found, it might be a special page we don't want
              continue;
            }

            const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
            const existing = await db.getArticleBySlug(slug);
            if (existing) continue;

            console.log(`[Automation] Extracting details for: "${title}"`);
            
            let coverImage = "";
            const ogImage = $art('meta[property="og:image"]').attr('content');
            
            // Try to find a high-quality image from meta or content
            if (ogImage && !isSuspiciousImage(ogImage)) {
              coverImage = ogImage;
            }

            if (!coverImage || isSuspiciousImage(coverImage)) {
               // Look for images in the content area
               $art(source.contentSelector).find('img').each((i, img) => {
                 const src = $art(img).attr('data-src') || $art(img).attr('src') || $art(img).attr('data-original');
                 if (src && !isSuspiciousImage(src)) {
                   const fullUrl = src.startsWith('http') ? src : (src.startsWith('/') ? source.baseUrl + src : source.baseUrl + '/' + src);
                   // Prefer the first non-suspicious image
                   if (!coverImage) coverImage = fullUrl;
                   return false; // break
                 }
               });
            }

            // Fallback to Unsplash if still no image
            if (!coverImage || isSuspiciousImage(coverImage)) {
              coverImage = getUnsplashFallback(title);
            }

            $art('script, style, iframe, .adsbygoogle, .banners, .whatsapp-button, .social-share, footer, nav, header, .related-posts, .noticias-relacionadas, .sidebar, .comments, .wp-block-embed, .post-navigation, .sharedaddy, .jp-relatedposts').remove();
            
            let contentHtml = "";
            let stopScraping = false;
            const contentBlocks = $art(source.contentSelector);
            
            if (contentBlocks.length > 0) {
              const uniqueParagraphs = new Set<string>();
              let pCount = 0;
              const maxParagraphs = (source.name === "GE Globo" || source.name === "g1 Norte Fluminense") ? 50 : 20;

              contentBlocks.each((i, block) => {
                if (stopScraping || pCount >= maxParagraphs) return false;

                const items = $art(block).find('p, h2, h3, h4, li');
                if (items.length > 0) {
                  items.each((j, item) => {
                    if (stopScraping) return false;

                    let text = $art(item).text().trim();
                    
                    // Stop extraction if we hit a "Related News" section common in local portals
                    const stopPhrases = [
                      /leia\s+também/i, /veja\s+também/i, /leia\s+mais/i, /veja\s+mais/i, 
                      /confira\s+ainda/i, /materia\s+relacionada/i, /notícias\s+relacionadas/i,
                      /publicidade/i, /continua\s+após\s+a\s+publicidade/i, /compartilhe/i,
                      /programação\s+organizada/i, /fabricante\s+ypê/i, /vereador\s+de\s+campos/i,
                      /siga-nos\s+no/i, /entre\s+no\s+nosso\s+canal/i, /grupo\s+de\s+whatsapp/i
                    ];

                    // Extra check: if paragraph has too many links, it's likely a related news block
                    const linkCount = $art(item).find('a').length;
                    if (linkCount > 2) return true; // skip this paragraph

                    if (stopPhrases.some(p => p.test(text.substring(0, 40)))) {
                      stopScraping = true;
                      return false; 
                    }

                    // Skip short text (usually captions/credits) or text with forbidden patterns
                    if (text.length > 50 && !uniqueParagraphs.has(text)) {
                      let isDirty = false;
                      for (const regex of FORBIDDEN_WORDS) {
                        if (regex.test(text)) { isDirty = true; break; }
                      }
                      if (!isDirty && pCount < maxParagraphs) {
                        uniqueParagraphs.add(text);
                        contentHtml += `<p>${text}</p>\n`;
                        pCount++;
                      }
                    }
                  });
                } else {
                  let text = $art(block).text().trim();
                  if (text.length > 80 && !uniqueParagraphs.has(text)) {
                      uniqueParagraphs.add(text);
                      contentHtml += `<p>${text}</p>\n`;
                  }
                }
              });
            }

            if (contentHtml.length < 300) {
              contentHtml = $art('p').map((i, el) => `<p>${$art(el).text().trim()}</p>`).get().join('\n');
            }

            // --- Smart Text Cleaning & Branding ---
            let cleanContent = cleanAndBrandText(contentHtml);
            let finalTitle = cleanAndBrandText(title, true);

            // Remove internal links
            cleanContent = cleanContent.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');

            if (cleanContent.length < 250) continue;

            // --- Smart Image Selection ---
            let finalImage = coverImage;

            if (!finalImage || isSuspiciousImage(finalImage)) {
              // 1. Try to find a real photo in the article body
              const bodyImgs = $art(source.contentSelector).find('img').map((i, el) => $art(el).attr('src')).get();
              const realPhoto = bodyImgs.find(src => src && !isSuspiciousImage(src));
              
              if (realPhoto) {
                finalImage = realPhoto.startsWith('http') ? realPhoto : (realPhoto.startsWith('/') ? source.baseUrl + realPhoto : source.baseUrl + '/' + realPhoto);
              } else {
                // 2. Use a high-quality Unsplash image based on the title
                finalImage = getUnsplashFallback(finalTitle);
              }
            }

            let categoryName = "Geral";
            const lowerLink = link.toLowerCase();
            const lowerTitle = finalTitle.toLowerCase();
            
            // Refined category detection
            const isSports = 
              source.name.includes("Esportes") || 
              source.name.includes("GE") ||
              lowerLink.includes("esporte") || 
              lowerLink.includes("futebol") ||
              lowerLink.includes("copa") ||
              lowerLink.includes("brasileirao") ||
              lowerTitle.includes("futebol") || 
              lowerTitle.includes("basquete") || 
              lowerTitle.includes("vôlei") || 
              lowerTitle.includes("mma") || 
              lowerTitle.includes("playoff") ||
              lowerTitle.includes("olimpí") ||
              lowerTitle.includes("campeonato");

            if (isSports) categoryName = "Esportes";
            else if (lowerLink.includes("policia") || lowerTitle.includes("preso") || lowerTitle.includes("crime") || lowerTitle.includes("assalto")) categoryName = "Polícia";
            else if (lowerLink.includes("cidade") || lowerTitle.includes("campos") || lowerTitle.includes("prefeitura")) categoryName = "Cidades";
            else if (lowerLink.includes("economia") || lowerTitle.includes("vaga") || lowerTitle.includes("emprego") || lowerTitle.includes("preço")) categoryName = "Economia";

            const categoryId = await getOrCreateCategory(categoryName);

            await db.createArticle({
              title,
              slug,
              excerpt: $art('meta[name="description"]').attr('content')?.substring(0, 250) || cleanContent.substring(0, 250),
              content: cleanContent,
              author: "Equipe Editorial",
              categoryId,
              coverImage: coverImage,
              sourceUrl: link,
              publishedAt: publishedAt,
              published: true,
            });

            results.push({ title, status: "success", source: source.name });
          } catch (err) {}
        }
      } catch (err) {
        console.error(`[Automation] Error ${source.name}:`, err);
      }
    }

    return {
      success: true,
      processed: SOURCES.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("[Robô] Erro:", error);
    throw error;
  }
}

export async function checkAndRunAutomation() {
  try {
    const firestore = await db.getDb();
    const settingsDoc = await firestore.collection("settings").doc("automation").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { interval: "4", lastRun: null };
    
    const intervalHours = parseInt(settings.interval || "4");
    const lastRun = settings.lastRun ? new Date(settings.lastRun) : new Date(0);
    const now = new Date();
    
    if ((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60) >= intervalHours) {
      console.log(`[Agendador] Iniciando execução automática (${intervalHours}h)...`);
      await firestore.collection("settings").doc("automation").set({ lastRun: now.toISOString() }, { merge: true });
      automateNews().catch(console.error);
    }
  } catch (error) {
    console.error("[Agendador] Erro:", error);
  }
}

export async function cleanupExistingArticles() {
  try {
    const firestore = await db.getDb();
    console.log("[Automation] Iniciando faxina retroativa nas notícias...");
    
    const snapshot = await firestore.collection("articles").get();
    const stopPhrases = [
      /leia\s+também/i, /veja\s+também/i, /leia\s+mais/i, /veja\s+mais/i, 
      /confira\s+ainda/i, /materia\s+relacionada/i, /notícias\s+relacionadas/i,
      /publicidade/i, /continua\s+após\s+a\s+publicidade/i, /compartilhe/i,
      /clique\s+aqui/i, /acesse\s+também/i, /reportagem/i, /foto:/i,
      /receba\s+notícias/i, /grupo\s+de\s+whatsapp/i
    ];

    let count = 0;
    for (const doc of snapshot.docs) {
      const article = doc.data();
      if (!article.content) continue;

      let currentContent = cleanAndBrandText(article.content);
      let currentTitle = cleanAndBrandText(article.title || "", true);
      let currentImage = article.coverImage || "";

      // Fix Branded Images
      if (isSuspiciousImage(currentImage)) {
        console.log(`[Cleanup] Trocando imagem branded: ${currentImage.substring(0, 40)}...`);
        currentImage = getUnsplashFallback(currentTitle);
      }

      const paragraphs = currentContent.split('</p>');
      let cleanedParagraphs = [];
      let stopFound = false;

      for (let i = 0; i < paragraphs.length; i++) {
        let p = paragraphs[i];
        if (!p.trim()) continue;
        let text = p.replace(/<[^>]*>/g, "").trim();
        
        if (text.toLowerCase() === "publicidade" || text.toLowerCase() === "compartilhe") {
          continue;
        }

        if (stopPhrases.some(regex => regex.test(text.substring(0, 70)))) {
          stopFound = true;
        }

        if (stopFound) continue;

        const hasEndPunctuation = /[.!?:]$/.test(text);
        const isLikelyTitle = text.length > 30 && text.length < 180 && !hasEndPunctuation;
        
        if (isLikelyTitle && i > (paragraphs.length / 3)) {
          continue;
        }

        if (text.length > 45) {
          cleanedParagraphs.push(p + '</p>');
        }
      }

      const newContent = cleanedParagraphs.join("");
      
      const hasChanges = 
        newContent !== article.content || 
        currentTitle !== article.title || 
        currentImage !== article.coverImage;

      if (hasChanges && newContent.length > 150) {
        await doc.ref.update({ 
          content: newContent,
          title: currentTitle,
          coverImage: currentImage
        });
        count++;
      }
    }

    console.log(`[Automation] Faxina finalizada! ${count} notícias foram corrigidas.`);
    return count;
  } catch (error) {
    console.error("[Automation] Erro na faxina:", error);
    return 0;
  }
}
