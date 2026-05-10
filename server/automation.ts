import * as db from "./db.js";
import * as cheerio from "cheerio";
import { createArticle } from "./articles-crud.js";

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
    url: "https://ge.globo.com/rj/",
    linkSelector: 'a',
    titleSelector: 'h1.content-head__title, .content-head__title',
    contentSelector: '.content-text__container, .content-text, .entry-content',
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
    url: "https://www.ururau.com.br/",
    linkSelector: 'a[href*="/noticias/"]',
    titleSelector: 'h1, h2.titulo',
    contentSelector: 'article, .content-article, .post-content, .texto-materia, #texto-materia',
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

const FORBIDDEN_WORDS = [
  /Ururau/gi, /Portal Ururau/gi, /ururau\.com\.br/gi,
  /Campos Ocorrências/gi, /camposocorrencias\.com\.br/gi,
  /Prefeitura de Campos/gi, /campos\.rj\.gov\.br/gi,
  /Globo Esporte/gi, /Globo\.com/gi, /GE\.com/gi, /GE/g, /Globo/g,
  /Reprodução/gi, /Foto:\s*[^<]*/gi, /Fonte:\s*[^<]*/gi,
  /Leia também:[^<]*/gi, /Confira abaixo:[^<]*/gi,
  /Inscreva-se no canal[^<]*/gi, /Siga o g1[^<]*/gi,
  /Siga o canal.*?no WhatsApp/gi, /📱[^<]*/gi,
  /Veja também:[^<]*/gi, /LEIA TAMBÉM:[^<]*/gi,
  /Aviso importante: a total ou parcial[^.]*/gi,
  /reproduzir nosso conteúdo, entre em contato[^.]*/gi,
  /comercial@[^.]*/gi
];

async function getOrCreateCategory(name: string) {
  const categories = await db.getCategories();
  const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const newCat = await db.createCategory({ name, slug });
  return newCat.id;
}

export async function automateNews() {
  console.log("[Robô] Verificando fontes...");
  const firestore = await db.getDb();
  const updateStatus = async (msg: string, prog: number, active: boolean) => {
    await firestore.collection("automation_status").doc("current").set({
      message: msg,
      progress: prog,
      updatedAt: new Date().toISOString(),
      isAutomating: active
    });
  };

  try {
    await updateStatus("Iniciando faxina...", 5, true);
    await cleanupOldArticles();
    const results: any[] = [];

    for (let i = 0; i < SOURCES.length; i++) {
      const source = SOURCES[i];
      const progress = Math.round(10 + (i / SOURCES.length) * 85);
      try {
        await updateStatus(`Buscando no site: ${source.name}`, progress, true);
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

        const uniqueLinks = [...new Set(links)].slice(0, 5);

        for (const link of uniqueLinks) {
          try {
            const artRes = await fetch(link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            if (!artRes.ok) continue;

            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);

            let title = $art(source.titleSelector).first().text().trim();
            if (!title || title.length < 20 || title.includes("Autor:") || title.includes("Destaque")) continue;

            const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
            const existing = await db.getArticleBySlug(slug);
            if (existing) continue;

            console.log(`[Automation] Extracting details for: "${title}"`);

            let coverImage = $art('meta[property="og:image"]').attr('content') || "";
            if (coverImage.includes('video-thumb') || !coverImage) {
              const imgTag = $art(source.contentSelector).find('img').first().attr('src');
              if (imgTag) coverImage = imgTag.startsWith('http') ? imgTag : source.baseUrl + imgTag;
            }

            $art('script, style, iframe, .adsbygoogle, .banners, .whatsapp-button, .social-share, footer, nav, header, .related-posts, .recommended-posts, .post-navigation').remove();

            const STOP_WORDS = [
              /Um post compartilhado por/gi,
              /Leia também:/gi,
              /Veja também:/gi,
              /Confira abaixo:/gi,
              /Aviso importante:/gi,
              /A programação organizada pela/gi,
              /O vereador de Campos/gi,
              /A concessionária Águas do Paraíba/gi,
              /A fabricante Ypê/gi
            ];

            let contentHtml = "";
            const contentBlocks = $art(source.contentSelector);
            if (contentBlocks.length > 0) {
              const uniqueParagraphs = new Set<string>();
              let stopReading = false;

              contentBlocks.each((i, block) => {
                if (stopReading) return;
                
                const items = $art(block).find('p, h2, h3, h4, li');
                if (items.length > 0) {
                  items.each((j, item) => {
                    const text = $art(item).text().trim();
                    
                    // Check for stop words
                    for (const regex of STOP_WORDS) {
                      if (regex.test(text)) {
                        stopReading = true;
                        break;
                      }
                    }

                    if (stopReading) return false;

                    if (text.length > 40 && !uniqueParagraphs.has(text)) {
                      uniqueParagraphs.add(text);
                      contentHtml += `<p>${text}</p>\n`;
                    }
                  });
                } else {
                  const text = $art(block).text().trim();
                  
                  // Check for stop words in single blocks
                  for (const regex of STOP_WORDS) {
                    if (regex.test(text)) {
                      stopReading = true;
                      break;
                    }
                  }

                  if (!stopReading && text.length > 50 && !uniqueParagraphs.has(text)) {
                    uniqueParagraphs.add(text);
                    contentHtml += `<p>${text}</p>\n`;
                  }
                }
              });
            }

            if (contentHtml.length < 300) {
              contentHtml = $art('p').map((i, el) => `<p>${$art(el).text().trim()}</p>`).get().join('\n');
            }

            let cleanContent = contentHtml.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
            for (const regex of FORBIDDEN_WORDS) {
              cleanContent = cleanContent.replace(regex, "");
              title = title.replace(regex, "");
            }

            if (cleanContent.length < 300) continue;

            let categoryName = "Geral";
            const lowerLink = link.toLowerCase();
            const lowerTitle = title.toLowerCase();
            if (source.name.includes("Esportes") || lowerLink.includes("esporte") || lowerTitle.includes("futebol") || lowerTitle.includes("playoff")) categoryName = "Esportes";
            else if (lowerLink.includes("policia") || lowerTitle.includes("preso") || lowerTitle.includes("crime")) categoryName = "Polícia";
            else if (lowerLink.includes("cidade") || lowerTitle.includes("campos")) categoryName = "Cidades";
            else if (lowerLink.includes("economia") || lowerTitle.includes("vaga")) categoryName = "Economia";

            const categoryId = await getOrCreateCategory(categoryName);

            await db.createArticle({
              title,
              slug,
              excerpt: $art('meta[name="description"]').attr('content')?.substring(0, 250) || cleanContent.substring(0, 250),
              content: cleanContent,
              author: "Equipe Editorial",
              categoryId,
              coverImage: coverImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800",
              publishedAt: new Date(),
              published: true,
            });

            results.push({ title, status: "success", source: source.name });
          } catch (err) { }
        }
      } catch (err) {
        console.error(`[Automation] Error ${source.name}:`, err);
      }
    }

    await updateStatus("Automação concluída!", 100, false);
    return {
      success: true,
      processed: SOURCES.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("[Robô] Erro:", error);
    await updateStatus("Erro na automação!", 100, false);
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
