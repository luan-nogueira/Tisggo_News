import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.ts";
import { registerStorageProxy } from "../server/_core/storageProxy.ts";
import { appRouter } from "../server/routers.ts";
import { createContext } from "../server/_core/context.ts";

const app = express();

// Configura limites de payload para uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Registra rotas proxy e de autenticação
registerStorageProxy(app);
registerOAuthRoutes(app);

// Registra a API tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Exporta o aplicativo Express para ser consumido pela Vercel Serverless Functions
export default app;
