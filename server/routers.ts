import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getArticles,
  getArticleBySlug,
  incrementArticleViews,
  getArticlesByCategory,
  searchArticles,
  getCategories,
} from "./db";
import { generateSitemap } from "./sitemap";
import { createArticle, updateArticle, deleteArticle, createArticleSchema, updateArticleSchema } from "./articles-crud";
import { automateNews } from "./automation";
import { sdk } from "./_core/sdk";
import { upsertUser } from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

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
    loginAdmin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (input.email !== ENV.adminEmail || input.password !== ENV.adminPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "E-mail ou senha incorretos",
          });
        }

        const adminUser = {
          openId: "admin-system-id",
          name: "Administrador",
          email: input.email,
          role: "admin" as const,
        };

        // Ensure user exists in DB
        await upsertUser(adminUser);

        // Create session token
        const token = await sdk.createSessionToken(adminUser.openId, { name: adminUser.name });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true };
      }),
  }),

  articles: router({
    list: publicProcedure.query(async () => {
      return getArticles(20);
    }),
    bySlug: publicProcedure.input((val: unknown) => {
      if (typeof val === "string") return val;
      throw new Error("Invalid slug");
    }).query(async ({ input }) => {
      const article = await getArticleBySlug(input);
      if (article) {
        await incrementArticleViews(article.id);
      }
      return article;
    }),
    byCategory: publicProcedure.input((val: any) => {
      if (typeof val === "number") return { categoryId: val, orderBy: "recent" as const };
      if (typeof val === "object" && val !== null && typeof val.categoryId === "number") {
        return { categoryId: val.categoryId as number, orderBy: (val.orderBy as "recent" | "popular") || "recent" };
      }
      throw new Error("Invalid input for byCategory");
    }).query(async ({ input }) => {
      return getArticlesByCategory(input.categoryId, 20, 0, input.orderBy);
    }),
    search: publicProcedure.input((val: unknown) => {
      if (typeof val === "string") return val;
      throw new Error("Invalid search query");
    }).query(async ({ input }) => {
      return searchArticles(input);
    }),
    create: protectedProcedure.input(createArticleSchema).mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create articles" });
      }
      return createArticle(input);
    }),
    update: protectedProcedure.input(updateArticleSchema).mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update articles" });
      }
      return updateArticle(input);
    }),
    delete: protectedProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid article ID");
    }).mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete articles" });
      }
      return deleteArticle(input);
    }),
    automate: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can automate news" });
      }
      return automateNews();
    }),
  }),
  categories: router({
    list: publicProcedure.query(async () => {
      return getCategories();
    }),
  }),
  sitemap: router({
    generate: publicProcedure.query(async () => {
      const baseUrl = process.env.VITE_APP_URL || "https://tisgo-news.manus.space";
      return await generateSitemap(baseUrl);
    }),
  }),
});

export type AppRouter = typeof appRouter;
