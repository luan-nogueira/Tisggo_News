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
  getDb,
} from "./db.js";
import { generateSitemap } from "./sitemap.js";
import { createArticle, updateArticle, deleteArticle, createArticleSchema, updateArticleSchema } from "./articles-crud.js";
import { automateNews } from "./automation.js";
import { getBrasileirao, getBrasileiraoGames } from "./football.js";
import { z } from "zod";
import { storagePut } from "./storage.js";

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
      context: z.string().optional()
    })).mutation(async ({ input }) => {
      try {
        const { invokeLLM } = await import("./_core/llm.js");
        const { getArticles } = await import("./db.js");
        
        console.log(`[AI Chat] Pergunta recebida: "${input.question}"`);

        // Busca notícias recentes com timeout curto para não travar
        let newsContext = "Nenhuma notícia recente disponível no momento.";
        try {
          const recentArticles = await getArticles(5);
          if (recentArticles && recentArticles.length > 0) {
            newsContext = recentArticles.map(a => `- ${a.title}: ${a.excerpt}`).join("\n");
          }
        } catch (dbErr) {
          console.error("[AI Chat] Erro ao buscar notícias:", dbErr);
        }

        // Tenta buscar o clima de Campos com timeout para segurança
        let weatherInfo = "Informação de clima temporariamente indisponível.";
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos de limite
          
          const weatherRes = await fetch("https://wttr.in/Campos+dos+Goytacazes?format=%C+%t+%w", { 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (weatherRes.ok) {
            weatherInfo = await weatherRes.text();
          }
        } catch (e) {
          console.log("[AI Chat] Clima indisponível ou timeout.");
        }

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é o Assistente Virtual do portal Tisgo News. Responda de forma curta e amigável. Contexto: ${weatherInfo}.`
            },
            {
              role: "user",
              content: input.question
            }
          ]
        });

        if (!response) {
          throw new Error("Resposta da IA veio vazia.");
        }
        
        return {
          answer: response
        };
      } catch (err: any) {
        console.error("[AI Chat ERROR]", err);
        return {
          answer: "Desculpe, estou passando por uma manutenção técnica rápida. Por favor, tente novamente em alguns minutos!"
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
