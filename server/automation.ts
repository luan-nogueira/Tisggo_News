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
  forcedCategory?: string; // Nova propriedade para forçar categoria
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
  },
  {
    name: "ESPN Brasileirão",
    url: "https://www.espn.com.br/futebol/liga/_/nome/bra.1",
    linkSelector: 'section.Card a[href*="/noticia/"]',
    titleSelector: 'h1.article-header__title, .article-header h1',
    contentSelector: '.article-body p',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.espn.com.br",
    forcedCategory: "Esportes" // Força tudo da ESPN para Esportes
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
  /comercial@[^.]*/gi,
  /ESPN/g, /espn\.com\.br/gi, /Siga a ESPN.*?no WhatsApp/gi
];

const STOP_WORDS = [
  /Leia tambm/i,
  /Veja mais/i,
  /Confira tambm/i,
  /Publicidade/i,
  /Continua aps a publicidade/i,
  /Faa parte do nosso grupo/i,
  /Receba as principais notcias/i,
  /ururau\.com\.br/i,
  /Foto:/i,
  /VDEO:/i,
];

async function getOrCreateCategory(name: string) {
  const categories = await db.getCategories();
  const normalizedInput = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  
  const existing = categories.find(c => {
    const normalizedExisting = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    return normalizedExisting === normalizedInput;
  });

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
    }, { merge: true });
  };

  const checkStop = async () => {
    const doc = await firestore.collection("automation_status").doc("current").get();
    return doc.exists && doc.data()?.stopRequested === true;
  };

  // Reset inicial: Limpa qualquer pedido de parada anterior antes de começar
  await firestore.collection("automation_status").doc("current").update({
    stopRequested: false,
    isAutomating: true
  });

  try {
    await updateStatus("Iniciando faxina...", 5, true);
    await cleanupOldArticles();
    
    // RETROACTIVE CLEANING: Clean existing dirty articles
    await updateStatus("Validando notícias existentes...", 8, true);
    const existingSnapshot = await firestore.collection("articles").limit(50).get(); // Clean newest 50
    for (const doc of existingSnapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      if (content.includes("Um post compartilhado por") || content.includes("Aviso importante:")) {
         const paragraphs = content.split(/<\/p>/i);
         let newContent = "";
         let stopped = false;
         for (let p of paragraphs) {
            const cleanP = p.replace(/<p>/i, "").trim();
            if (!cleanP) continue;
            const textOnly = cleanP.replace(/<[^>]*>/g, '').trim();
            for (const regex of STOP_WORDS) { if (regex.test(textOnly)) { stopped = true; break; } }
            if (stopped) break;
            newContent += `<p>${cleanP}</p>\n`;
         }
          if (newContent.trim() !== content.trim()) {
             // Final polish: remove double spaces and triple newlines
             const polished = newContent
                .replace(/<p>\s*<\/p>/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
             
             // If content has very little actual text after cleaning, it's probably broken
             const textOnly = polished.replace(/<[^>]*>/g, '').trim();
             if (textOnly.length < 200) {
                console.log(`[Automation] Deletando notícia curta/quebrada: ${data.title}`);
                await doc.ref.delete();
                continue;
             }

             await doc.ref.update({ content: polished });
          }
          
          // Remove branding from titles too
          let cleanTitle = data.title || "";
          for (const regex of FORBIDDEN_WORDS) {
            cleanTitle = cleanTitle.replace(regex, "").trim();
          }
          if (cleanTitle !== data.title) {
            await doc.ref.update({ title: cleanTitle });
          }
      }
    }

    const results: any[] = [];

    for (let i = 0; i < SOURCES.length; i++) {
      const stop = await checkStop();
      console.log(`[Automation] Check stop for source ${i}: ${stop}`);
      if (stop) {
        await updateStatus("Automação interrompida pelo usuário.", 0, false);
        return results;
      }
      const source = SOURCES[i];
      const progress = Math.round(10 + (i / SOURCES.length) * 85);
      try {
        await updateStatus("Estamos buscando notícias na região para implementar no site", progress, true);
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
          if (await checkStop()) {
            await updateStatus("Automação interrompida pelo usuário.", 0, false);
            return results;
          }
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de limite

            const artRes = await fetch(link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!artRes.ok) continue;

            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);

            let title = $art(source.titleSelector).first().text().trim();
            if (!title || title.length < 20 || title.includes("Autor:") || title.includes("Destaque")) continue;

            const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
            const existing = await db.getArticleBySlug(slug);
            if (existing) continue;

            console.log(`[Automation] Extracting details for: "${title}"`);
            await updateStatus(`Encontrei uma notícia: ${title.substring(0, 30)}...`, progress, true);

            let coverImage = $art('meta[property="og:image"]').attr('content') || "";
            if (coverImage.includes('video-thumb') || !coverImage) {
              const imgTag = $art(source.contentSelector).find('img').first().attr('src');
              if (imgTag) coverImage = imgTag.startsWith('http') ? imgTag : source.baseUrl + imgTag;
            }
            
            // Branded image fallback (Ururau often watermarks their main OG image)
            if (coverImage.includes('ururau')) {
               const alternative = $art(source.contentSelector).find('img').map((i, el) => $art(el).attr('src')).get().find(src => src && !src.includes('ururau'));
               if (alternative) coverImage = alternative.startsWith('http') ? alternative : source.baseUrl + alternative;
            }

            $art('script, style, iframe, .adsbygoogle, .banners, .whatsapp-button, .social-share, footer, nav, header, .related-posts, .recommended-posts, .post-navigation').remove();


            let contentHtml = "";
            const contentBlocks = $art(source.contentSelector);
            if (contentBlocks.length > 0) {
              const uniqueParagraphs = new Set<string>();
              let stopReading = false;

              const blocksArray = contentBlocks.toArray();
              for (const block of blocksArray) {
                if (stopReading) break;
                
                const items = $art(block).find('p, h2, h3, h4, li, table').toArray();
                if (items.length > 0) {
                  for (const item of items) {
                    if (await checkStop()) { 
                      stopReading = true; 
                      break; 
                    }
                    
                    if (item.name === 'table') {
                       // Basic table cleanup
                       $art(item).find('script, style').remove();
                       $art(item).addClass('w-full border-collapse my-4 text-sm');
                       $art(item).find('th, td').addClass('border border-gray-700 p-2 text-left');
                       contentHtml += $art(item).prop('outerHTML') + '\n';
                       return;
                    }
                    const text = $art(item).text().trim();
                    const html = $art(item).html() || "";
                    
                    // Detect and skip "Related Posts" or "Ads" blocks that use lists or specific classes
                    if (html.includes('href') && (text.includes('Leia também') || text.includes('Veja mais') || text.includes('Confira'))) return;
                    if ($art(item).closest('.related, .recommended, .ads, .sidebar').length > 0) return;

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
                  }
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
              }
            }

            await updateStatus(`Implementando notícia: ${title.substring(0, 20)}...`, progress, true);

            let cleanContent = contentHtml.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
            for (const regex of FORBIDDEN_WORDS) {
              cleanContent = cleanContent.replace(regex, "");
              title = title.replace(regex, "");
            }

            if (cleanContent.length < 300) continue;

            // Detect if it's a table-heavy article (e.g., F1, Brasileirão)
            const isTableArticle = title.toLowerCase().includes('tabela') || title.toLowerCase().includes('classificação') || cleanContent.includes('Posição') || cleanContent.includes('Pontos');
            
            if (isTableArticle) {
               cleanContent += `
                <div class="mt-8 p-6 bg-accent/5 border border-accent/20 rounded-2xl text-center">
                  <p class="text-foreground font-bold mb-4">Esta notícia contém tabelas e classificações detalhadas.</p>
                  <a href="${link}" target="_blank" class="inline-flex items-center justify-center px-6 py-3 bg-accent text-black font-black rounded-xl hover:bg-yellow-500 transition-all uppercase text-sm">
                    Ver Tabela Completa na Fonte Original
                  </a>
                </div>`;
            }

            await updateStatus(`Finalizando ajustes e classificando...`, progress, true);

            let categoryId;
            let categoryName = "";
            if (source.forcedCategory) {
              categoryName = source.forcedCategory;
              categoryId = await getOrCreateCategory(source.forcedCategory);
            } else {
              categoryId = await classifyAndGetCategoryId(title, cleanContent, link);
              // Buscar o nome da categoria para o log
              const categories = await db.getCategories();
              const cat = categories.find(c => c.id === categoryId);
              categoryName = cat ? cat.name : "Geral";
            }

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
              sourceUrl: link,
            });

            await updateStatus(`Postada com sucesso em ${categoryName}!`, progress, true);

            results.push({ title, status: "success", source: source.name });
          } catch (err) { }
        }
      } catch (err) {
        console.error(`[Automation] Error ${source.name}:`, err);
      }
    }

    console.log("[Automation] Automação encerrada.");
    await updateStatus("Automação concluída com sucesso!", 100, false);
    // Limpa o flag de parada ao finalizar normalmente
    await firestore.collection("automation_status").doc("current").update({ stopRequested: false });
    
    return results;
  } catch (error) {
    console.error("[Robô] Erro fatal:", error);
    await updateStatus("Erro na automação. Tente novamente.", 0, false);
    return [];
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
    let cleanedCount = 0;

    const stopPhrases = [
      "Um post compartilhado por",
      "Leia também:",
      "Veja também:",
      "Confira abaixo:",
      "Aviso importante:",
      "A programação organizada pela",
      "O vereador de Campos",
      "A concessionária Águas do Paraíba",
      "A fabricante Ypê",
      "Inscreva-se no canal",
      "Siga o g1",
      "Siga o canal",
      "WhatsApp",
      "reproduzir nosso conteúdo",
      "comercial@"
    ];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      let title = data.title || "";
      
      let needsUpdate = false;
      let newContent = "";
      let stopped = false;

      // Clean title if it has forbidden words
      let newTitle = title;
      FORBIDDEN_WORDS.forEach(regex => {
        if (regex.test(newTitle)) {
          newTitle = newTitle.replace(regex, "").trim();
          needsUpdate = true;
        }
      });

      // Clean content
      const paragraphs = content.split(/<\/p>/i);
      for (let p of paragraphs) {
        const cleanP = p.replace(/<p>/i, "").trim();
        if (!cleanP) continue;
        
        const textOnly = cleanP.replace(/<[^>]*>/g, '').trim();
        
        // Check for stop phrases
        for (const phrase of stopPhrases) {
          if (textOnly.toLowerCase().includes(phrase.toLowerCase())) {
            stopped = true;
            needsUpdate = true;
            break;
          }
        }
        
        if (stopped) break;
        newContent += `<p>${cleanP}</p>\n`;
      }

      if (needsUpdate || newContent.trim() !== content.trim()) {
        await doc.ref.update({ 
          content: newContent.trim(),
          title: newTitle
        });
        cleanedCount++;
      }
    }

    console.log(`[Automation] Faxina concluída! ${cleanedCount} notícias limpas.`);
    return cleanedCount;
  } catch (error) {
    console.error("[Automation] Erro na faxina:", error);
    throw error;
  }
}

/**
 * Helper to classify articles based on keywords in title, content and link
 */
async function classifyAndGetCategoryId(title: string, content: string, link: string = "") {
  const text = (title + " " + content + " " + link).toLowerCase();
  const titleLower = title.toLowerCase();
  
  const keywords: Record<string, string[]> = {
    "Esportes": [
      // Futebol
      "futebol", "série a", "brasileirão", "flamengo", "vasco", "fluminense", "botafogo",
      "campeonato estadual", "campeonato carioca", "campeonato brasileiro", "gol", "partida",
      "atleta", "esporte", "estádio", "taça", "libertadores", "copa do brasil", "copa do mundo",
      "seleção brasileira", "vôlei", "basquete", "olimpíadas", "ranking esportivo",
      // Fórmula 1
      "fórmula 1", "formula 1", "f1", "gp do brasil", "grande prêmio", "grid de largada",
      "piloto", "corrida de f1", "verstappen", "hamilton", "leclerc", "norris", "ferrari",
      "red bull racing", "mercedes f1", "mclaren", "box pit", "pole position", "volta mais rápida",
      // Surf
      "surf", "wsl", "circuito mundial de surfe", "tubo", "manobra",
      // Tênis
      "tênis", "torneio de tênis", "roland garros", "wimbledon", "us open", "australian open",
      "atp", "wta", "grand slam", "saque", "set", "match point", "alcaraz", "djokovic", "sinner",
      // MMA / Boxe / Luta
      "mma", "ufc", "boxe", "luta", "nocaute", "ko", "cinturão", "pesagem", "round",
      "combate", "ring", "octógono",
      // Outros
      "golfe", "natação", "atletismo", "ciclismo", "rugby", "handebol", "ginástica",
      "maratona", "corrida de rua", "triathlon", "esgrima", "judô", "caratê", "wrestling"
    ],
    "Polícia": [
      // Ocorrências / Crimes
      "preso", "presa", "apreendido", "apreendida", "detido", "detida", "autuado",
      "assalto", "roubo", "furto", "latrocínio", "homicídio", "feminicídio", "assassinato",
      "crime", "criminoso", "bandido", "marginal", "quadrilha", "gangue", "milícia",
      "tráfico", "droga", "cocaína", "maconha", "crack", "entorpecente", "boca de fumo",
      // Forças de segurança
      "polícia", "policial", "policiais", "polícia militar", "pm", "polícia civil", "polícia federal", "delegacia",
      "bombeiros", "corpo de bombeiros", "samu", "guarda municipal",
      // Ações policiais
      "flagrante", "prisão em flagrante", "mandado de prisão", "mandado de busca",
      "operação policial", "blitz", "abordagem", "busca e apreensão",
      "investigação policial", "inquérito policial", "indiciado",
      // Armas / Violência
      "arma de fogo", "revólver", "pistola", "fuzil", "espingarda", "faca",
      "tiro", "baleado", "ferido", "vítima", "lesão corporal",
      // Acidentes
      "acidente de trânsito", "colisão", "atropelamento", "capotamento", "batida",
      "morte no trânsito", "vítima fatal",
      // Outros
      "sequestro", "extorsão", "estelionato", "fraude policial", "golpe", "enganação",
      "resgate", "socorro", "incêndio", "explosão"
    ],
    "Economia": [
      // Macroeconomia
      "dólar", "euro", "câmbio", "pib", "inflação", "ipca", "igpm", "deflação",
      "taxa selic", "juros", "banco central", "copom",
      // Empresas / Mercado
      "empresa", "mercado financeiro", "bolsa de valores", "ações", "investimento",
      "lucro", "prejuízo", "falência", "recuperação judicial", "fusão", "aquisição",
      "startup", "empreendedor", "negócio",
      // Emprego / Trabalho
      "emprego", "desemprego", "vaga de emprego", "contratação", "demissão",
      "carteira de trabalho", "salário mínimo", "reajuste salarial", "concurso público",
      // Petróleo / Energia
      "petróleo", "royalties", "pré-sal", "petrobras", "refinaria", "combustível",
      "gasolina", "diesel", "etanol", "energia elétrica", "tarifa de energia",
      // Impostos / Finanças públicas
      "imposto", "icms", "iss", "ir", "imposto de renda", "receita federal",
      "orçamento público", "licitação", "contrato público", "despesa pública",
      "tributação", "reforma tributária", "arrecadação",
      // Comércio
      "comércio", "exportação", "importação", "balança comercial", "indústria",
      "agronegócio", "safra", "colheita", "commodities"
    ],
    "Cidades": [
      // Campos e região
      "campos dos goytacazes", "campos", "farol de são thomé", "guarus", "pelinca",
      "macaé", "são joão da barra", "quissamã", "cardoso moreira", "são fidélis",
      "italva", "cambuci", "bom jesus do itabapoana",
      // Administração municipal
      "prefeitura de campos", "prefeito de campos", "câmara municipal de campos",
      "vereador de campos", "secretaria municipal", "administração municipal",
      // Infraestrutura / Obras
      "obras públicas", "pavimentação", "asfalto", "calçada", "buraco na via",
      "interdição de via", "semáforo", "sinalização", "iluminação pública",
      "ponte", "viaduto", "ciclovia", "obra de drenagem",
      // Serviços públicos
      "saúde pública", "ubs", "hospital público", "postos de saúde", "vacina",
      "educação pública", "escola pública", "matrícula escolar", "merenda escolar",
      "coleta de lixo", "saneamento", "abastecimento de água", "falta de água",
      // Trânsito / Mobilidade
      "trânsito em campos", "engarrafamento", "interdição", "desvio de tráfego",
      "acidente em campos",
      // Cultura / Eventos locais
      "evento em campos", "show em campos", "festival local", "carnaval de campos",
      "réveillon de campos", "feriado local", "festa popular"
    ],
    "Política": [
      // Cargos
      "deputado federal", "deputado estadual", "senador", "ministro", "secretário de estado",
      "governador", "governo federal", "governo estadual", "câmara dos deputados",
      "senado federal", "assembleia legislativa",
      // Processos / Investigações
      "habeas corpus", "inquérito", "investigação federal", "cpi", "comissão parlamentar",
      "delação premiada", "colaboração premiada", "processo judicial",
      "tribunal de contas", "tcu", "trf", "stf", "stj", "supremo tribunal federal",
      // Política local
      "quaquá", "maicon cruz", "garotinho", "anthony garotinho",
      "clarissa garotinho", "rosinha", "wladimir garotinho",
      // Partidos / Eleições
      "partido político", "pt", "pl", "psdb", "mdb", "pp", "psd", "união brasil",
      "eleição", "eleições municipais", "eleições estaduais", "urna eletrônica",
      "candidato", "campanha eleitoral", "tse", "coligação", "chapa",
      // Operações
      "operação lava jato", "operação rota fantasma", "operação policia federal",
      "corrupção", "desvio de verba", "propina", "lavagem de dinheiro",
      "improbidade administrativa", "licitação fraudulenta",
      // Federação
      "reforma política", "pec", "projeto de lei", "votação no congresso",
      "veto presidencial", "medida provisória", "decreto presidencial"
    ],
    "Geral": ["notícia", "informação", "portal", "região"]
  };

  // Função de matching com limite de palavra para evitar falsos positivos
  const matchesWord = (text: string, word: string): boolean => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  };

  let bestCategory = "Geral";
  let maxScore = 0;

  for (const [category, words] of Object.entries(keywords)) {
    let score = 0;
    words.forEach(word => {
      if (matchesWord(text, word)) score += 1;
    });
    
    // Título pesa 3x mais
    words.forEach(word => {
      if (matchesWord(titleLower, word)) score += 3;
    });

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // Só classifica se tiver confiança suficiente
  if (maxScore < 2) bestCategory = "Geral";

  return await getOrCreateCategory(bestCategory);
}

/**
 * Retroactively recategorize all articles based on content analysis
 */
export async function recategorizeExistingArticles() {
  try {
    const firestore = await db.getDb();
    
    // 1. Standardize categories and fix slugs/duplicates
    await fixCategoriesAndSlugs();

    console.log("[Automation] Iniciando re-categorização de notícias...");
    
    const snapshot = await firestore.collection("articles").get();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentCategoryId = data.categoryId;
      const title = data.title || "";
      const content = data.content || "";
      
      // Protege notícias categorizadas manualmente pelo editor
      if (data.manualCategory === true) continue;
      
      const newCategoryId = await classifyAndGetCategoryId(title, content);

      if (newCategoryId && newCategoryId !== currentCategoryId) {
        await doc.ref.update({ categoryId: newCategoryId });
        updatedCount++;
      }
    }

    console.log(`[Automation] Re-categorização concluída! ${updatedCount} notícias movidas.`);
    return updatedCount;
  } catch (error) {
    console.error("[Automation] Erro na re-categorização:", error);
    throw error;
  }
}

/**
 * Merges duplicate categories and updates articles to point to the correct one.
 * Example: Merges "Policia" into "Polícia"
 */
export async function mergeDuplicateCategories() {
  try {
    const firestore = await db.getDb();
    console.log("[Automation] Iniciando unificação de categorias duplicadas...");
    
    const categories = await db.getCategories();
    const seen = new Map<string, string>(); // normalized name -> correct ID
    let mergedCount = 0;

    for (const cat of categories) {
      const normalized = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      
      if (seen.has(normalized)) {
        const targetId = seen.get(normalized)!;
        const duplicateId = cat.id;
        
        console.log(`[Automation] Mesclando categoria "${cat.name}" (${duplicateId}) em ID ${targetId}`);
        
        // Update all articles in this duplicate category
        const articlesSnapshot = await firestore.collection("articles").where("categoryId", "==", duplicateId).get();
        for (const doc of articlesSnapshot.docs) {
           await doc.ref.update({ categoryId: targetId });
           mergedCount++;
        }

        // Delete the duplicate category
        await firestore.collection("categories").doc(duplicateId).delete();
      } else {
        seen.set(normalized, cat.id);
      }
    }

    console.log(`[Automation] Unificação concluída! ${mergedCount} notícias atualizadas.`);
    return mergedCount;
  } catch (error) {
    console.error("[Automation] Erro na unificação:", error);
    throw error;
  }
}

/**
 * Ensures all standard categories exist with correct slugs and merges others into them.
 */
export async function fixCategoriesAndSlugs() {
  try {
    const firestore = await db.getDb();
    console.log("[Automation] Padronizando categorias e slugs...");

    const standardCategories = [
      { name: "Cidades", slug: "cidades" },
      { name: "Economia", slug: "economia" },
      { name: "Esportes", slug: "esportes" },
      { name: "Polícia", slug: "policia" },
      { name: "Geral", slug: "geral" },
    ];

    const existingCategories = await db.getCategories();
    const nameToId = new Map<string, string>();

    // 1. Ensure standards exist and are correct
    for (const std of standardCategories) {
      const normalizedStd = std.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      let cat = existingCategories.find(c => 
        c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === normalizedStd
      );

      if (!cat) {
        console.log(`[Automation] Criando categoria padrão: ${std.name}`);
        const newCat = await db.createCategory(std);
        nameToId.set(normalizedStd, newCat.id);
      } else {
        // Update name/slug if they are slightly off
        if (cat.name !== std.name || cat.slug !== std.slug) {
          console.log(`[Automation] Corrigindo categoria: ${cat.name} -> ${std.name}`);
          await db.updateCategory(cat.id, { name: std.name, slug: std.slug });
        }
        nameToId.set(normalizedStd, cat.id);
      }
    }

    // 2. Merge everything else into Geral or their closest match
    for (const cat of existingCategories) {
      const normalized = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      
      if (!nameToId.has(normalized)) {
        // It's a non-standard category. If it matches one of our keywords, move it.
        // For now, let's just move them to "Geral" if they aren't one of the standards.
        const targetId = nameToId.get("geral")!;
        
        console.log(`[Automation] Movendo notícias de "${cat.name}" para "Geral"...`);
        
        const articlesSnapshot = await firestore.collection("articles").where("categoryId", "==", cat.id).get();
        for (const doc of articlesSnapshot.docs) {
           await doc.ref.update({ categoryId: targetId });
        }

        // Delete the non-standard category
        await firestore.collection("categories").doc(cat.id).delete();
      }
    }

    console.log("[Automation] Padronização concluída.");
  } catch (error) {
    console.error("[Automation] Erro na padronização:", error);
  }
}
