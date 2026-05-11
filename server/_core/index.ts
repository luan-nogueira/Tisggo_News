// Forced redeploy: 2026-05-11 14:53 - gemini-2.0-flash fix
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { checkAndRunAutomation } from "../automation.js";

// Inicia o agendador automático (verifica a cada 5 min)
setInterval(() => {
  checkAndRunAutomation().catch(console.error);
}, 5 * 60 * 1000);

// Executa uma vez no início
checkAndRunAutomation().catch(console.error);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Endpoint para manter o site vivo (ping) - DEVE vir antes do serveStatic
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  // Mecanismo de auto-ping para o plano gratuito do Render
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (url) {
      fetch(`${url}/api/ping`).catch(() => {});
      console.log("[Keep-Alive] Auto-ping enviado");
    }
  }, 10 * 60 * 1000); // 10 minutos

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
