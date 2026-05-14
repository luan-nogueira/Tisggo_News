import * as db from "./db.js"; // Forced redeploy for grammar fixes
import * as cheerio from "cheerio";
import { createArticle } from "./articles-crud.js";
import { invokeLLM } from "./_core/llm.js";

// Limpa notícias com mais de 10 dias
async function cleanupOldArticles() {
  try {
    const firestore = await db.getDb();
    const settingsDoc = await firestore.collection("settings").doc("automation").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { autoCleanup: true };
    if (!settings?.autoCleanup) return;

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const snapshot = await firestore.collection("articles")
      .where("createdAt", "<", tenDaysAgo.toISOString())
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
  forcedCategory?: string;
  limit?: number; // Limite de notícias por ciclo
}

const SOURCES: NewsSource[] = [
  {
    name: "GE Globo",
    url: "https://ge.globo.com/rj/",
    linkSelector: 'a',
    titleSelector: 'h1.content-head__title, .content-head__title',
    contentSelector: '.content-text__container, .content-text, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://ge.globo.com",
    limit: 3
  },
  {
    name: "g1 Norte Fluminense",
    url: "https://g1.globo.com/rj/norte-fluminense/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1.content-head__title',
    contentSelector: '.content-text__container, .content-text',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://g1.globo.com",
    limit: 4
  },
  {
    name: "Ururau",
    url: "https://www.ururau.com.br/",
    linkSelector: 'a[href*="/noticias/"]',
    titleSelector: 'h1, h2.titulo',
    contentSelector: 'article, .content-article, .post-content, .texto-materia, #texto-materia',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.ururau.com.br",
    limit: 10
  },
  {
    name: "Campos Ocorrências",
    url: "https://camposocorrencias.com.br/",
    linkSelector: 'a',
    titleSelector: 'h1, .entry-title',
    contentSelector: '.elementor-widget-theme-post-content, .entry-content, article',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://camposocorrencias.com.br",
    limit: 8
  },
  {
    name: "ESPN Brasileirão",
    url: "https://www.espn.com.br/futebol/liga/_/nome/bra.1",
    linkSelector: 'a.realStory, a[class*="realStory"]',
    titleSelector: 'h1.article-header__title, .article-header h1, h1',
    contentSelector: '.article-body p, .article-body',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.espn.com.br",
    forcedCategory: "Esportes",
    limit: 2
  },
  {
    name: "GE Brasileirão",
    url: "https://ge.globo.com/futebol/brasileirao-serie-a/",
    linkSelector: 'a.feed-post-link',
    titleSelector: 'h1.content-head__title, h1',
    contentSelector: '.content-text__container, .article__content p',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "",
    forcedCategory: "Esportes",
    limit: 2
  },
  {
    name: "UOL Esporte",
    url: "https://www.uol.com.br/esporte/futebol/campeonatos/brasileirao/",
    linkSelector: 'a.hyperlink, .thumbnails-item a',
    titleSelector: 'h1.titulo, .content-head__title, h1',
    contentSelector: '.text p, .content-text__container',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "",
    forcedCategory: "Esportes",
    limit: 2
  },
  {
    name: "J3 News",
    url: "https://j3news.com/",
    linkSelector: 'a[href*="/noticias/"], a[href*="/campos/"]',
    titleSelector: 'h1.entry-title, h1',
    contentSelector: '.td-post-content, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://j3news.com",
    limit: 15
  },
  {
    name: "NF Notícias",
    url: "https://www.nfnoticias.com.br/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1, .titulo-noticia',
    contentSelector: '.noticia_texto, #texto-materia, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.nfnoticias.com.br",
    limit: 10
  },
  {
    name: "NF Notícias - Esportes",
    url: "https://www.nfnoticias.com.br/editoria-3/esportes",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1, .titulo-noticia',
    contentSelector: '.noticia_texto, #texto-materia, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.nfnoticias.com.br",
    forcedCategory: "Esportes",
    limit: 6
  },
  {
    name: "NF Notícias - Geral",
    url: "https://www.nfnoticias.com.br/editoria-1/geral",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1, .titulo-noticia',
    contentSelector: '.noticia_texto, #texto-materia, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.nfnoticias.com.br",
    forcedCategory: "Geral",
    limit: 6
  },
  {
    name: "NF Notícias - Política",
    url: "https://www.nfnoticias.com.br/editoria-2/politica",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1, .titulo-noticia',
    contentSelector: '.noticia_texto, #texto-materia, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.nfnoticias.com.br",
    forcedCategory: "Política",
    limit: 6
  },
  {
    name: "NF Notícias - Cidades",
    url: "https://www.nfnoticias.com.br/editoria-6/cidades",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1, .titulo-noticia',
    contentSelector: '.noticia_texto, #texto-materia, .entry-content',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.nfnoticias.com.br",
    forcedCategory: "Cidade",
    limit: 6
  },
  {
    name: "Manchete RJ",
    url: "https://mancheterj.com/",
    linkSelector: 'a[href*="/noticia/"]',
    titleSelector: 'h1.post-title, h1',
    contentSelector: '.post-content, .entry-content, #content-area',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://mancheterj.com",
    limit: 12
  },
  {
    name: "Folha da Manhã",
    url: "https://www.fmanha.com.br/",
    linkSelector: 'a[href*="/campos/"], a[href*="/politica/"]',
    titleSelector: 'h1, .titulo-materia',
    contentSelector: '.texto-materia, .entry-content, article',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.fmanha.com.br",
    limit: 12
  },
  {
    name: "Prefeitura de Campos",
    url: "https://www.campos.rj.gov.br/ultimas-noticias.php",
    linkSelector: 'a[href*="noticia.php"]',
    titleSelector: 'h1, h2, .titulo-noticia, .title',
    contentSelector: '.texto-noticia, #conteudo, article, .content, .texto',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.campos.rj.gov.br",
    limit: 10
  },
  {
    name: "Prefeitura de SJB",
    url: "https://www.sjb.rj.gov.br/home",
    linkSelector: 'a[href*="/noticia/"], a[href*="/noticias/"], a[href*="/post/"]',
    titleSelector: 'h1, .post-title, .titulo, h2',
    contentSelector: 'article, .post-content, .entry-content, .conteudo',
    imageSelector: 'meta[property="og:image"]',
    baseUrl: "https://www.sjb.rj.gov.br",
    limit: 10
  }
];

const FORBIDDEN_WORDS = [
  // Portais Locais e Regionais
  /Ururau/gi, /Portal Ururau/gi, /ururau\.com\.br/gi,
  /Campos Ocorrências/gi, /camposocorrencias\.com\.br/gi,
  /J3\s*News/gi, /j3news\.com/gi, /j3news/gi, /Jornal Terceira Via/gi, /Terceira Via/gi,
  /NF\s*Notícias/gi, /nfnoticias\.com\.br/gi, /nfnoticias/gi,
  /Manchete\s*RJ/gi, /mancheterj\.com/gi, /mancheterj/gi,
  /Folha da Manhã/gi, /fmanha\.com\.br/gi, /fmanha/gi, /Blog do Bastos/gi, /Ponto de Vista/gi,
  /InterTV/gi, /Inter\s*TV/gi, /Plície/gi,

  // Prefeituras e Assessorias
  /Prefeitura de Campos/gi, /campos\.rj\.gov\.br/gi, /Prefeitura de São João da Barra/gi, /Prefeitura de SJB/gi, /sjb\.rj\.gov\.br/gi, /Secom/gi, /Subcom/gi, /Assessoria de Comunicação/gi,

  // Nacionais / Esportes
  /Globo Esporte/gi, /Globo\.com/gi, /GE\.com/gi, /\bGE\b/g, /\bGlobo\b/g, /\bg1\b/gi, /Portal g1/gi,
  /UOL/gi, /uol\.com\.br/gi, /UOL Esporte/gi,
  /ESPN/g, /espn\.com\.br/gi, /Siga a ESPN.*?no WhatsApp/gi,

  // Expressões genéricas de jornais
  /Reprodução/gi, /Foto:\s*[^<]*/gi, /Fonte:\s*[^<]*/gi, /Créditos:\s*[^<]*/gi,
  /Leia também:[^<]*/gi, /Confira abaixo:[^<]*/gi,
  /Inscreva-se no canal[^<]*/gi, /Siga o g1[^<]*/gi, /Siga o canal[^<]*/gi,
  /Siga o canal.*?no WhatsApp/gi, /📱[^<]*/gi,
  /Veja também:[^<]*/gi, /LEIA TAMBÉM:[^<]*/gi,
  /Aviso importante: a total ou parcial[^.]*/gi,
  /reproduzir nosso conteúdo, entre em contato[^.]*/gi,
  /comercial@[^.]*/gi,
  /Matéria retirada do portal/gi, /Conteúdo extraído de/gi,
];

// Palavras/frases que indicam conteúdo patrocinado/pago — esses artigos são ignorados completamente
const PAID_CONTENT_SIGNALS = [
  /conteúdo patrocinado/i,
  /conteudo patrocinado/i,
  /publicidade/i,
  /publieditorial/i,
  /\binforme publicitário\b/i,
  /\binforme publicitar[^a]/i,
  /\bpatrocinado por\b/i,
  /sponsored content/i,
  /\bpubli\b/i,
  /\bads?\b/i,
  /anúncio/i,
  /parceria comercial/i,
  /branded content/i,
  /apoio institucional/i,
  /nota\s+de\s+imprensa/i,
  /press\s+release/i,
  /em parceria com/i,
];

function isPaidContent(title: string, content: string, url: string): boolean {
  const combined = `${title} ${content} ${url}`.toLowerCase();
  return PAID_CONTENT_SIGNALS.some(pattern => pattern.test(combined));
}

async function processArticleWithAI(originalTitle: string, originalContent: string, sourceUrl: string) {
  try {
    console.log(`[Robô Inteligente] Analisando e processando notícia: "${originalTitle.substring(0, 40)}..."`);
    
    // Limpeza profunda: remove hifens suaves, quebras de linha que cortam palavras e espaços duplos
    const textOnly = originalContent
      .replace(/[\u00AD\u200B\u200C\u200D\u2060\uFEFF]/g, '') // Remove soft hyphens e outros caracteres invisíveis
      .replace(/-\s*\n\s*/g, '-') // Une palavras que terminam em hífen e quebra de linha (mantendo o hífen)
      .replace(/([a-z0-9])\n([a-z0-9])/gi, '$1 $2') // Une linhas que quebram palavras sem hífen
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é o Editor-Chefe de IA do portal Tisgo News, operando com a tecnologia GPT-4o. Sua missão é transformar matérias brutas em conteúdo jornalístico de ELITE (padrão G1, Folha de SP, CNN).

DIRETRIZES DE OURO:
1. REESCRITA TOTAL E CRIATIVA: Não apenas resuma. Re-escreva a história com um fluxo narrativo envolvente, parágrafos bem conectados e vocabulário rico. Use o "Lide" jornalístico (O quê, quem, quando, onde, como e por quê) no primeiro parágrafo.
2. GRAMÁTICA E REVISÃO: Sua saída deve ser IMPECÁVEL. Corrija erros de digitação da fonte original, una palavras que vieram quebradas (ex: "Norte Flumin ense" -> "Norte Fluminense") e nunca corte frases.
3. ESTILO TISGO: Use um tom profissional, mas ágil e moderno. Se a notícia for de urgência (polícia/acidente), use um tom mais direto. Se for cultura/cidade, use um tom mais leve.
4. FOCO LOCAL: Valorize informações sobre Campos dos Goytacazes, São João da Barra e região Norte Fluminense.
5. LIMPEZA IMPLACÁVEL (Outros Jornais): Sob nenhuma hipótese mencione nomes de outros portais ou jornais no texto gerado (ex: G1, Globo, GE, Ururau, NF Notícias, J3 News, Terceira Via, Manchete RJ, Folha da Manhã, UOL, ESPN, InterTV, etc.). Se a matéria original citar "Segundo o jornal X", reformule para "Segundo relatos da imprensa local" ou apenas remova a atribuição externa. Remova nomes de repórteres de outras empresas, links e convites para redes sociais ou WhatsApp.
6. FORMATAÇÃO: Use tags <p> para parágrafos e <strong> para destacar nomes de pessoas, locais ou entidades importantes.
7. ISOLAMENTO DA NOTÍCIA PRINCIPAL: O texto bruto fornecido pode conter, por engano de raspagem do site original, pedaços, manchetes ou resumos de OUTRAS notícias (ex: listagens de "leia também", "últimas notícias" ou barras laterais). IGNORE COMPLETAMENTE qualquer informação que não esteja diretamente conectada com o assunto principal do "Título Original". Em hipótese alguma misture fatos ou eventos de outras notícias no texto gerado.

FORMATO DE RETORNO (JSON):
{
  "title": "Título Impactante e Magnético",
  "content": "Conteúdo rico e formatado em HTML (<p>, <strong>)",
  "category": "Política | Polícia | Esportes | Cidade | Economia | Geral",
  "excerpt": "Um resumo instigante de até 200 caracteres para redes sociais",
  "tags": ["tag1", "tag2"],
  "qualityScore": 0.95
}`
        },
        {
          role: "user",
          content: `URL da Fonte: ${sourceUrl}\nTítulo Original: ${originalTitle}\n\nConteúdo para Processar: ${textOnly}`
        }
      ],
      responseFormat: { type: "json_object" }
    });

    let cleanJsonStr = response.trim();
    const jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
    const jsonToParse = jsonMatch ? jsonMatch[0] : cleanJsonStr;
    const result = JSON.parse(jsonToParse);
    
    // Se o score de qualidade for muito baixo, avisamos o robô
    if (result.qualityScore < 0.3) {
      console.log(`[Robô Inteligente] Notícia descartada por baixa qualidade/relevância (Score: ${result.qualityScore})`);
      return null;
    }

    console.log(`[Robô Inteligente] Notícia processada com sucesso. Categoria sugerida: ${result.category}`);
    
    return {
      title: result.title.trim(),
      content: result.content.trim(),
      category: result.category,
      excerpt: result.excerpt,
      tags: result.tags || []
    };
  } catch (error) {
    console.error("[Robô Inteligente] Erro no processamento IA:", error);
    return {
      title: originalTitle,
      content: originalContent,
      category: "Geral",
      excerpt: originalTitle,
      tags: []
    };
  }
}

async function processRetroactiveRewrites() {
  try {
    console.log("[Robô] Verificando notícias antigas para re-escrita retroativa...");
    const dbInstance = db.getDb() as any;
    if (dbInstance.error) return;

    // Fetch articles from the last 2 days to fix grammar
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const snapshot = await dbInstance.collection("articles")
      .where("publishedAt", ">=", twoDaysAgo)
      .get();

    const articles = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    // Rewrite articles that were source-based to ensure the new grammar rules are applied
    const toRewrite = articles.filter((a: any) => a.sourceUrl);

    if (toRewrite.length === 0) {
      console.log("[Robô] Nenhuma notícia antiga pendente de re-escrita.");
      return;
    }

    console.log(`[Robô] Encontradas ${toRewrite.length} notícias para re-escrita retroativa.`);

    for (const article of toRewrite) {
      const aiResult = await processArticleWithAI(article.title, article.content, article.sourceUrl || "");
      
      if (aiResult) {
        await db.updateArticle(article.id, {
          title: aiResult.title,
          content: aiResult.content,
          excerpt: aiResult.excerpt || aiResult.title.substring(0, 250),
          aiRewritten: true,
          updatedAt: new Date() as any
        });
        console.log(`[Robô] Notícia "${article.id}" atualizada retroativamente.`);
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error("[Robô] Erro no processamento retroativo:", error);
  }
}

const STOP_WORDS = [
  /Leia também/i,
  /Leia tambm/i,
  /Veja mais/i,
  /Confira também/i,
  /Publicidade/i,
  /Continua após a publicidade/i,
  /Continua aps a publicidade/i,
  /Faça parte do nosso grupo/i,
  /Faa parte do nosso grupo/i,
  /Receba as principais notícias/i,
  /ururau\.com\.br/i,
  /Inscreva-se/i,
  /Siga o/i,
  /Clique aqui/i,
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
  console.log("[Automation] Starting news automation cycle...");
  
  const firestore = await db.getDb();
  let successCount = 0;

  const updateStatus = async (msg: string, prog: number, active: boolean) => {
    await firestore.collection("automation_status").doc("current").set({
      message: msg,
      progress: prog,
      updatedAt: new Date().toISOString(),
      isAutomating: active,
      lastCount: successCount
    }, { merge: true });
  };

  // Inicializa status imediatamente para o Admin ver
  await updateStatus("Iniciando robô...", 0, true);

  // Re-escrita retroativa em paralelo desativada temporariamente para focar 100% da cota IA no ciclo principal
  // processRetroactiveRewrites().catch(err => console.error("[Retroactive] Error:", err));

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
        await updateStatus(`Buscando novas notícias na região...`, progress, true);
        console.log(`[Automation] Scraping source: ${source.name}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);
        const links: string[] = [];

        $(source.linkSelector).each((i, el) => {
          let href = $(el).attr('href');
          if (href) {
            if (!href.startsWith('http')) href = source.baseUrl + (href.startsWith('/') ? '' : '/') + href;
            // Relaxed filters to catch more articles - using return to skip in .each loop
            if (source.name === "Ururau" && !href.includes("/noticias/")) return;
            if ((source.name === "GE Globo" || source.name === "g1 Norte Fluminense") && !href.includes(".ghtml")) return;
            if (source.name === "Campos Ocorrências" && !href.includes(new Date().getFullYear().toString())) return;
            links.push(href);
          }
        });

        // Amplia a amostragem para ler até as primeiras 20 URLs exclusivas da capa, cobrindo carrosséis e listagens ocultas
        const uniqueLinks = [...new Set(links)].slice(0, Math.max(source.limit || 10, 15));

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

            // Blacklist check
            const isBlacklisted = await db.isUrlBlacklisted(link);
            if (isBlacklisted) {
              console.log(`[Automation] Skipping blacklisted URL: ${link}`);
              continue;
            }

            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);

            let title = $art(source.titleSelector).first().text().trim();
            if (!title || title.length < 10 || title.includes("Autor:") || title.includes("Destaque")) continue;

            // ── Filtro de conteúdo pago/patrocinado ────────────────────────────
            // Detecta sinais de publieditorial, assessoria ou elogio a gestores
            const pageTitleAndMeta = [
              title,
              $art('meta[name="description"]').attr('content') || '',
              $art('meta[property="og:description"]').attr('content') || '',
              $art('.author, .by, .byline').first().text() || ''
            ].join(' ');

            if (isPaidContent(title, pageTitleAndMeta, link)) {
              console.log(`[Automation] Ignorando conteúdo patrocinado/publieditorial: "${title}"`);
              continue;
            }

            // Padrões de títulos laudatórios típicos de assessoria de imprensa
            const laudatoryPatterns = [
              /governo .{2,30} (vira|é|se torna|conquista|lidera) exemplo/i,
              /prefeito.{0,20}(inaugura|entrega|garante|assina)/i,
              /governadora?.{0,20}(visita|anuncia|lança|beneficia)/i,
              /gestão .{2,20}(avança|destaca|comemora|celebra)/i,
              /\bpor \w+ \w+\b.*assessoria/i,
            ];
            if (laudatoryPatterns.some(p => p.test(title + ' ' + pageTitleAndMeta))) {
              console.log(`[Automation] Ignorando artigo laudatório de assessoria: "${title}"`);
              continue;
            }
            // ──────────────────────────────────────────────────────────────────

            const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
            if (await db.isUrlBlacklisted(slug)) {
              console.log(`[Automation] Skipping blacklisted slug: ${slug}`);
              continue;
            }
            const existing = await db.getArticleBySlug(slug);
            if (existing) continue;

            // ── Validação rigorosa de Antiguidade: Notícias de no máximo 12 horas ──
            let articleDate: Date | null = null;
            const pubDateStr = $art('meta[property="article:published_time"]').attr('content') ||
                               $art('meta[property="og:updated_time"]').attr('content') ||
                               $art('meta[name="pubdate"]').attr('content') ||
                               $art('meta[name="date"]').attr('content') ||
                               $art('time[itemprop="datePublished"]').attr('datetime') ||
                               $art('time').first().attr('datetime');

            if (pubDateStr) {
              const parsed = new Date(pubDateStr);
              if (!isNaN(parsed.getTime())) articleDate = parsed;
            }

            if (!articleDate) {
              const headerText = $art('header, .post-header, .entry-header, .data-hora, .time, .date, .publicado, .author, .byline, .td-post-date').text() || "";
              const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})(?:\s*(?:às|-)?\s*(\d{2})[:h](\d{2}))?/i;
              const match = headerText.match(dateRegex);
              if (match) {
                const day = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const year = parseInt(match[3]);
                const hours = match[4] ? parseInt(match[4]) : 0;
                const minutes = match[5] ? parseInt(match[5]) : 0;
                articleDate = new Date(year, month, day, hours, minutes);
              }
            }

            if (articleDate) {
              const hoursOld = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60);
              if (hoursOld > 12) {
                console.log(`[Automation] Ignorando notícia velha (${Math.round(hoursOld)}h atrás, limite é 12h): "${title}"`);
                continue;
              }
            } else {
              // Checa se a URL denuncia uma data antiga
              const urlDateMatch = link.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
              if (urlDateMatch) {
                const year = parseInt(urlDateMatch[1]);
                const month = parseInt(urlDateMatch[2]) - 1;
                const day = parseInt(urlDateMatch[3]);
                const urlDate = new Date(year, month, day);
                const hoursOld = (Date.now() - urlDate.getTime()) / (1000 * 60 * 60);
                if (hoursOld > 24) {
                  console.log(`[Automation] Ignorando notícia com data antiga na URL: "${title}"`);
                  continue;
                }
              }
            }
            // ────────────────────────────────────────────────────────────────────────

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

            // Remove de forma agressiva todas as listagens secundárias, rodapés e barras laterais para evitar vazamento/mistura de outras notícias
            $art('aside, .sidebar, .widget, .related, .relacionados, .veja-tambem, .outras-noticias, .recent-posts, .latest-posts, .more-news, .mais-noticias, .posts-relacionados, .comments, #comments, .td-related-posts, .elementor-widget-recent-posts, section.related, div[class*="related"], div[class*="relacionad"], div[class*="recommend"], div[class*="outras"], script, style, iframe, .adsbygoogle, .banners, .whatsapp-button, .social-share, footer, nav, header, .related-posts, .recommended-posts, .post-navigation').remove();


            let contentHtml = "";
            const contentBlocks = $art(source.contentSelector);
            if (contentBlocks.length > 0) {
              const uniqueParagraphs = new Set<string>();
              let stopReading = false;

              const blocksArray = contentBlocks.toArray();
              for (const block of blocksArray) {
                if (stopReading) break;
                
                // Se o próprio bloco for ou estiver dentro de uma área secundária ou link de outra notícia, ignoramos
                if ($art(block).closest('a, aside, footer, .sidebar, .related').length > 0) continue;
                
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
                       continue;
                    }
                    const text = $art(item).text().trim();
                    const html = $art(item).html() || "";
                    
                    // Detect and skip "Related Posts" or "Ads" blocks that use lists or specific classes
                    if (html.includes('href') && (text.includes('Leia também') || text.includes('Veja mais') || text.includes('Confira'))) continue;
                    if ($art(item).closest('.related, .recommended, .ads, .sidebar').length > 0) continue;

                    // Check for stop words
                    for (const regex of STOP_WORDS) {
                      if (regex.test(text)) {
                        stopReading = true;
                        break;
                      }
                    }

                    if (stopReading) break;

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

            if (cleanContent.length < 150) continue; // Reduced threshold from 300 to 150

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

            let videoUrl = "";
            // Detect ESPN Video
            if (source.name.includes("ESPN")) {
              const videoIdMatch = artHtml.match(/["']videoId["']\s*:\s*["'](\d+)["']/i) || 
                                  artHtml.match(/\/video\/clip\/_\/id\/(\d+)/i) ||
                                  artHtml.match(/["']id["']\s*:\s*["'](\d+)["']/i) ||
                                  link.match(/\/id\/(\d+)/);
              if (videoIdMatch && videoIdMatch[1]) {
                videoUrl = `https://www.espn.com.br/core/video/iframe?id=${videoIdMatch[1]}`;
                console.log(`[Automation] Video detected for ESPN: ${videoUrl}`);
              }
            }

            await updateStatus(`Finalizando ajustes e classificando...`, progress, true);

            await updateStatus(`Finalizando ajustes e classificando...`, progress, true);

            // AI-First Processing
            const aiProcessed = await processArticleWithAI(title, cleanContent, link);
            if (!aiProcessed) continue; // Skip if AI marked as low quality

            let categoryId;
            let categoryName = aiProcessed.category;
            
            if (source.forcedCategory) {
              categoryName = source.forcedCategory;
              categoryId = await getOrCreateCategory(source.forcedCategory);
            } else {
              // Try to use AI suggested category, fallback to keyword classification
              categoryId = await getOrCreateCategory(aiProcessed.category);
              if (!categoryId) {
                categoryId = await classifyAndGetCategoryId(aiProcessed.title, aiProcessed.content, link);
              }
              const categories = await db.getCategories();
              const cat = categories.find(c => c.id === categoryId);
              categoryName = cat ? cat.name : "Geral";
            }

            await db.createArticle({
              title: aiProcessed.title,
              slug,
              excerpt: aiProcessed.excerpt || aiProcessed.content.substring(0, 250),
              content: aiProcessed.content,
              author: "Equipe Editorial",
              categoryId,
              coverImage: coverImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800",
              videoUrl: videoUrl || null,
              publishedAt: new Date(),
              published: false,
              sourceUrl: link,
              aiRewritten: true,
            });

            successCount++;
            await updateStatus(`Postada com sucesso em ${categoryName}! (${successCount} total)`, progress, true);

            results.push({ title: aiProcessed.title, status: "success", source: source.name });
            
            // ── Controle de Ritmo Inteligente (Throttling) ──
            // Aguarda 5 segundos entre as notícias para respeitar com segurança o teto de 15 RPM da camada gratuita
            await new Promise(r => setTimeout(r, 5000));
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
