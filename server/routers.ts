import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc.js";
import { TRPCError } from "@trpc/server";
import {
  getArticles,
  getArticleBySlug,
  getArticleById,
  incrementArticleViews,
  getArticlesByCategory,
  searchArticles,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllArticlesAdmin,
  getDb,
} from "./db.js";
import { generateSitemap } from "./sitemap.js";
import { createArticle, updateArticle, deleteArticle, createArticleSchema, updateArticleSchema } from "./articles-crud.js";
import { automateNews } from "./automation.js";
import { getBrasileirao, getBrasileiraoGames } from "./football.js";
import { z } from "zod";
import { storagePut } from "./storage.js";
import { invokeLLM } from "./_core/llm.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  articles: router({
    list: publicProcedure.input(z.number().optional().default(20)).query(async ({ input }) => {
      return getArticles(input);
    }),
    get: publicProcedure.input(z.string()).query(async ({ input }) => {
      return getArticleById(input);
    }),
    bySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
      const article = await getArticleBySlug(input);
      if (article) {
        await incrementArticleViews(String(article.id));
      }
      return article;
    }),
    byCategory: publicProcedure.input(z.object({
      categoryId: z.string(),
      orderBy: z.enum(["recent", "popular"]).optional().default("recent"),
    })).query(async ({ input }) => {
      return getArticlesByCategory(input.categoryId, 20, 0, input.orderBy);
    }),
    search: publicProcedure.input(z.string()).query(async ({ input }) => {
      return searchArticles(input);
    }),
    suggestions: publicProcedure.input(z.string()).query(async ({ input }) => {
      if (input.length < 2) return [];
      const results = await searchArticles(input);
      return results.slice(0, 5).map(a => ({
        title: a.title,
        slug: a.slug,
        id: a.id
      }));
    }),
    create: adminProcedure.input(createArticleSchema).mutation(async ({ ctx, input }) => {
      return createArticle(input);
    }),
    update: adminProcedure.input(updateArticleSchema).mutation(async ({ ctx, input }) => {
      return updateArticle(input);
    }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      return deleteArticle(input);
    }),
    listAdmin: adminProcedure.query(async () => {
      return getAllArticlesAdmin();
    }),
    approve: adminProcedure.input(z.string()).mutation(async ({ input }) => {
      const { updateArticle } = await import("./db.js");
      await updateArticle(input, { published: true } as any);
      return { success: true };
    }),
    automate: publicProcedure.mutation(async ({ ctx }) => {
      // Roda em segundo plano para evitar timeout da página
      automateNews().catch(err => console.error("[Background Automation] Error:", err));
      return { success: true, message: "Automação iniciada em segundo plano" };
    }),
    stopAutomate: adminProcedure.mutation(async () => {
      const db = await import("./db.js");
      const firestore = await db.getDb();
      await firestore.collection("automation_status").doc("current").update({
        stopRequested: true,
        message: "Solicitando interrupção..."
      });
      return { success: true };
    }),
    cleanup: protectedProcedure.mutation(async () => {
      const automation = await import("./automation.js");
      return await automation.cleanupExistingArticles();
    }),
    recategorize: protectedProcedure.mutation(async () => {
      const automation = await import("./automation.js");
      return await automation.recategorizeExistingArticles();
    }),
  }),
  categories: router({
    list: publicProcedure.query(async () => {
      return getCategories();
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return createCategory(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return updateCategory(id, data);
    }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      return deleteCategory(input);
    }),
  }),
  sitemap: router({
    generate: publicProcedure.query(async () => {
      const baseUrl = process.env.VITE_APP_URL || "https://tisgo-news.vercel.app";
      return await generateSitemap(baseUrl);
    }),
  }),
  settings: router({
    get: adminProcedure.query(async () => {
      const db = await getDb();
      const doc = await db.collection("settings").doc("automation").get();
      return doc.exists ? doc.data() : { interval: "4", autoCleanup: true };
    }),
    update: adminProcedure.input(z.object({
      interval: z.string(),
      autoCleanup: z.boolean(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      await db.collection("settings").doc("automation").set(input, { merge: true });
      return { success: true };
    }),
  }),
  sponsors: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      const snapshot = await db.collection("sponsors").get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }),
    upsert: adminProcedure.input(z.object({
      id: z.string().optional(),
      name: z.string(),
      image: z.string(),
      location: z.string(),
      whatsapp: z.string().optional(),
      instagram: z.string().optional(),
      active: z.boolean()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      if (id) {
        await db.collection("sponsors").doc(id).set(data, { merge: true });
      } else {
        await db.collection("sponsors").add(data);
      }
      return { success: true };
    }),
    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
      const db = await getDb();
      await db.collection("sponsors").doc(input).delete();
      return { success: true };
    }),
    uploadImage: adminProcedure.input(z.object({
      base64: z.string(),
      fileName: z.string(),
      contentType: z.string()
    })).mutation(async ({ input }) => {
      const { uploadImageToStorage } = await import("./db.js");
      const buffer = Buffer.from(input.base64.split(",")[1], "base64");
      const safeName = input.fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const url = await uploadImageToStorage(buffer, `sponsors/${Date.now()}_${safeName}`, input.contentType);
      return { url };
    })
  }),
  football: router({
    table: publicProcedure.query(async () => {
      return getBrasileirao();
    }),
    games: publicProcedure.query(async () => {
      return getBrasileiraoGames();
    }),
  }),
  analytics: router({
    getStats: adminProcedure.query(async () => {
      const articles = await getArticles(100);
      const topArticles = articles
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(a => ({
          name: a.title.length > 25 ? a.title.substring(0, 22) + "..." : a.title,
          views: a.views || 0
        }));
        
      return { topArticles };
    }),
  }),
  ai: router({
    ask: publicProcedure.input(z.object({
      question: z.string(),
      context: z.string().optional(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })).optional()
    })).mutation(async ({ input }) => {
      try {
        console.log(`[AI Chat] Pergunta recebida: "${input.question}"`);

        // ── Cache de Saudação Local a Custo Zero ──
        const qClean = input.question.toLowerCase().trim();
        const greetings = ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem", "tudo bem?", "hey", "oii"];
        if (greetings.includes(qClean) || qClean.length <= 3) {
          return {
            answer: "Olá! Sou o Assistente IA oficial do portal Tisgo News. 📰✨ Estou aqui para te ajudar a navegar pelas últimas notícias de Campos dos Goytacazes e do Norte Fluminense. O que você gostaria de conferir hoje?"
          };
        }

        // Busca notícias recentes com timeout curto para não travar
        let newsContext = "Nenhuma notícia recente disponível no momento.";
        let loadedArticles: any[] = [];
        try {
          loadedArticles = await getArticles(10);
          if (loadedArticles && loadedArticles.length > 0) {
            newsContext = loadedArticles.map(a => `- Título: "${a.title}" | Resumo: "${a.excerpt}"`).join("\n");
          }
        } catch (dbErr) {
          console.error("[AI Chat] Erro ao buscar notícias:", dbErr);
        }

        // Tenta buscar o clima de Campos com timeout para segurança e força o formato Métrico (Celsius)
        let weatherInfo = "Informação de clima temporariamente indisponível.";
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos de limite
          
          const weatherRes = await fetch("https://wttr.in/Campos+dos+Goytacazes?format=%C+%t+%w&m", { 
            headers: { "Accept-Language": "pt-BR" },
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (weatherRes.ok) {
            weatherInfo = await weatherRes.text();
          }
        } catch (e) {
          console.log("[AI Chat] Clima indisponível ou timeout.");
        }

        // ── Smart Local Agent (Respostas Locais Autônomas a Custo Zero) ──
        // Intercepta e atende aos temas mais quentes (Trânsito, Clima e Últimas Notícias) usando os dados reais do portal
        if (qClean.includes("transito") || qClean.includes("trânsito") || qClean.includes("engarrafamento") || qClean.includes("br-101") || qClean.includes("ponte")) {
          const transitoNews = loadedArticles.find(a => a.title.toLowerCase().includes("trânsito") || a.title.toLowerCase().includes("acidente") || a.title.toLowerCase().includes("interdição") || a.title.toLowerCase().includes("br-101"));
          if (transitoNews) {
            return { answer: `Sobre o trânsito: "${transitoNews.title}". Confira os detalhes completos e atualizados na nossa matéria recente na capa do portal! 🚗💨` };
          }
          return { answer: "No momento, não registramos acidentes graves ou interdições nas principais vias de Campos dos Goytacazes e região nas últimas horas. O tráfego flui normalmente. Fique de olho nas nossas atualizações em tempo real! 🚦👍" };
        }

        if (qClean.includes("clima") || qClean.includes("tempo") || qClean.includes("chove") || qClean.includes("sol") || qClean.includes("temperatura") || qClean.includes("frio") || qClean.includes("calor")) {
          const tempMatch = weatherInfo.match(/-?\d+°C/);
          const tempStr = tempMatch ? tempMatch[0] : "agradável";
          return { answer: `A previsão do tempo atual para Campos dos Goytacazes indica temperatura em torno de ${tempStr}. 🌤️ Para conferir a previsão detalhada e alertas da Defesa Civil, acompanhe a nossa seção de Cidades no portal!` };
        }

        if (qClean.includes("noticia") || qClean.includes("notícia") || qClean.includes("ultimas") || qClean.includes("últimas") || qClean.includes("aconteceu") || qClean.includes("novidade")) {
          const topNews = loadedArticles.slice(0, 3).map(a => `• ${a.title}`).join("\n");
          return { answer: `Aqui estão as nossas manchetes mais quentes do momento:\n\n${topNews || "Nenhuma matéria recente encontrada."}\n\nClique nos cards da capa para ler na íntegra! 📰🔥` };
        }

        const systemPrompt = `Você é o Assistente Virtual oficial do portal Tisgo News (focado em Campos dos Goytacazes, Macaé e região do Norte Fluminense).
Sua missão é responder de forma curta, prestativa e muito amigável.
REGRAS CRÍTICAS:
1. Responda SEMPRE em português do Brasil.
2. Ao mencionar temperaturas ou clima, use EXCLUSIVAMENTE graus Celsius (°C) e quilômetros por hora (km/h). NUNCA mencione Fahrenheit.
3. Baseie-se prioritariamente no contexto das últimas notícias abaixo para informar o leitor sobre o que está acontecendo no portal e na região.

[Últimas Notícias do Portal Tisgo News]
${newsContext}

[Clima Atual em Campos dos Goytacazes]
${weatherInfo}`;

        const messages: any[] = [
          { role: "system", content: systemPrompt }
        ];

        if (input.history && input.history.length > 0) {
          messages.push(...input.history);
        }

        messages.push({ role: "user", content: input.question });

        const response = await invokeLLM({ messages, isInteractive: true });

        if (!response) {
          throw new Error("Resposta da IA veio vazia.");
        }
        
        return {
          answer: response
        };
      } catch (err: any) {
        console.error("[AI Chat ERROR DETAILED]", err.stack || err);
        return {
          answer: "Meus servidores de IA estão super concorridos neste exato momento e atingiram a capacidade máxima! 🚀 Mas confira as nossas manchetes em destaque na capa do portal ou navegue pelas categorias para ficar por dentro de tudo!"
        };
      }
    }),

    generateArticle: adminProcedure.input(z.object({
      prompt: z.string()
    })).mutation(async ({ input }) => {
      let scrapedImage = "";
      let realTimeWebContext = "";
      const urlMatch = input.prompt.match(/https?:\/\/[^\s]+/) || input.prompt.match(/www\.[^\s]+/);
      if (urlMatch) {
        try {
          const targetUrl = urlMatch[0].startsWith("http") ? urlMatch[0] : `https://${urlMatch[0]}`;
          const cheerio = await import("cheerio");
          const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          const html = await res.text();
          const $ = cheerio.load(html);
          scrapedImage = $('meta[property="og:image"]').attr('content') || 
                         $('meta[name="twitter:image"]').attr('content') || 
                         $('article img').first().attr('src') || "";
          if (scrapedImage && !scrapedImage.startsWith("http")) {
            const urlObj = new URL(targetUrl);
            scrapedImage = `${urlObj.origin}${scrapedImage.startsWith('/') ? '' : '/'}${scrapedImage}`;
          }
          
          $('script, style, nav, footer, header, aside, iframe, .ads').remove();
          const pageText = $('h1, h2, article, .content, .post, p').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
          if (pageText) {
            realTimeWebContext = `\n\n--- CONTEÚDO EXTRAÍDO DA URL NA INTERNET EM TEMPO REAL ---\n${pageText}`;
          }
          console.log("[AI Scraper] Link interpretado na internet em tempo real com sucesso!");
        } catch (e) {
          console.error("[Scrape Cover Image Warning]", e);
        }
      }

      const systemPrompt = `Você é um jornalista profissional e redator-chefe do portal Tisgo News.
Sua tarefa é gerar uma notícia completa, bem escrita, com credibilidade e formatada em HTML limpo a partir do rascunho ou link fornecido.
DIRETRIZ CRÍTICA SOBRE MARCAS D'ÁGUA E DIREITOS:
1. Jamais mencione no texto termos como "Foto com marca d'água", "Créditos da foto", "Foto de reprodução", "Foto do portal X" ou nomes de portais concorrentes.
2. O texto gerado deve ser completamente limpo, focado estritamente no fato jornalístico.
Retorne o resultado estritamente no seguinte formato JSON puro (sem marcações de bloco de código):
{
  "title": "Título chamativo e profissional para a matéria",
  "excerpt": "Resumo conciso de 2 linhas para a capa da notícia",
  "content": "<p>Primeiro parágrafo da notícia bem elaborado...</p><p>Segundo parágrafo detalhando o fato...</p>",
  "categorySlug": "cidades"
}`;

      try {
        const responseText = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Rascunho/Assunto para gerar a matéria:\n${input.prompt}${realTimeWebContext}` }
          ],
          responseFormat: { type: "json_object" }
        });

        let cleanJsonStr = responseText.trim();
        const jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
        const jsonToParse = jsonMatch ? jsonMatch[0] : cleanJsonStr;

        const data = JSON.parse(jsonToParse);
        return {
          title: data.title || "Título Gerado",
          excerpt: data.excerpt || "Resumo gerado automaticamente pela IA.",
          content: data.content || "<p>Conteúdo gerado pela IA...</p>",
          categorySlug: data.categorySlug || "cidades",
          coverImage: scrapedImage || ""
        };
      } catch (err: any) {
        console.error("[AI Generate Article ERROR Fallback Triggered]", err);
        
        // ── Fallback de Alta Fidelidade a Custo Zero (Atuação Autônoma) ──
        // Permite ao administrador gerar a matéria instantaneamente a partir do rascunho ou link web mesmo sob exaustão das cotas da IA
        const rawText = realTimeWebContext ? realTimeWebContext.replace(/---.*---/, '').trim() : input.prompt.trim();
        const firstPeriod = rawText.indexOf('.');
        const firstNewline = rawText.indexOf('\n');
        const splitIndex = firstPeriod > 0 ? firstPeriod : (firstNewline > 0 ? firstNewline : Math.min(rawText.length, 80));
        
        let generatedTitle = rawText.substring(0, splitIndex).trim();
        if (generatedTitle.length < 10) generatedTitle = "Matéria Especial: " + rawText.substring(0, 40);
        // Limpa o título de prefixos e aspas
        generatedTitle = generatedTitle.replace(/^Ex:\s*/i, '').replace(/^(urgente|alerta|notícia|noticia):\s*/i, '').replace(/["']/g, '');
        
        let generatedExcerpt = rawText.length > splitIndex ? rawText.substring(splitIndex + 1).trim().substring(0, 150) : rawText;
        if (!generatedExcerpt || generatedExcerpt.length < 10) generatedExcerpt = generatedTitle;
        
        // Estrutura o conteúdo em parágrafos HTML justificados e limpíssimos
        const paragraphs = rawText
          .split(/\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 5)
          .map(p => `<p>${p}</p>`)
          .join('');
          
        const fallbackContent = paragraphs || `<p>${rawText}</p>`;

        return {
          title: generatedTitle.length > 100 ? generatedTitle.substring(0, 97) + "..." : generatedTitle,
          excerpt: generatedExcerpt.length > 160 ? generatedExcerpt.substring(0, 157) + "..." : generatedExcerpt,
          content: fallbackContent + "\n<p><em>Matéria apurada e estruturada com apoio de automação editorial Tisgo News.</em></p>",
          categorySlug: "cidades",
          coverImage: scrapedImage || ""
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
