import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import { checkAndRunAutomation } from "../server/automation.js";

// Gatilho para Vercel/Produção
checkAndRunAutomation().catch(console.error);

const app = express();

// Configura limites de payload para uploads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Registra rotas proxy e de autenticação
registerStorageProxy(app);
registerOAuthRoutes(app);

// Registra a API tRPC
app.use(
  "/trpc",
  (req, res, next) => {
    try {
      return createExpressMiddleware({
        router: appRouter,
        createContext,
        onError: ({ path, error }) => {
          console.error(`[tRPC Error] path: ${path}, error: ${error.message}`);
        }
      })(req, res, next);
    } catch (err: any) {
      res.status(500).json({ error: "tRPC Crash", message: err.message });
    }
  }
);

// Global Error Handler for Express
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[Express Global Error]:", err.message);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message 
  });
});

export default app;
