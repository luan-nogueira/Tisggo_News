// Forced redeploy: 2026-05-11 16:14 - Auth header fix
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
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
  // Confia no proxy reverso do Render para que req.protocol seja resolvido corretamente como https
  app.set("trust proxy", true);
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

  // Interceptador SSR de Open Graph universal para gerar cards ricos no WhatsApp e Redes Sociais
  app.use(async (req, res, next) => {
    const urlPath = req.path || req.url || "";
    const match = urlPath.match(/\/article\/([^\/?#]+)/);
    if (!match) {
      return next();
    }

    const slug = match[1];
    try {
      const { getArticleBySlug } = await import("../db.js");
      const article = await getArticleBySlug(slug);
      
      if (!article) {
        return next();
      }

      // Localiza o index.html gerado na pasta client ou dist
      const possibleIndexPaths = [
        path.resolve(import.meta.dirname, "../dist/index.html"),
        path.resolve(import.meta.dirname, "../../dist/index.html"),
        path.resolve(process.cwd(), "dist/index.html"),
        path.resolve(import.meta.dirname, "../../client/index.html")
      ];

      let indexPath = "";
      for (const p of possibleIndexPaths) {
        if (fs.existsSync(p)) {
          indexPath = p;
          break;
        }
      }

      let html = "";
      if (indexPath) {
        html = await fs.promises.readFile(indexPath, "utf-8");
      } else {
        // Fallback dinâmico garantido caso o arquivo estático principal não seja localizado no filesystem da Vercel
        html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tisgo News</title>
    <link rel="icon" type="image/png" href="/news-icon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      }

      const ogTitle = (article.title || "Tisgo News").replace(/"/g, '&quot;');
      const rawText = (article.excerpt || article.content || "").replace(/<[^>]*>/g, '');
      const ogDesc = (rawText.length > 160 ? rawText.substring(0, 160) + '...' : rawText).replace(/"/g, '&quot;');
      
      const host = req.get('host') || "tisgo.com.br";
      const protocol = host.includes("localhost") ? "http" : "https";
      const fullUrl = `${protocol}://${host}/article/${slug}`;

      let ogImage = article.coverImage || "";
      if (!ogImage || ogImage.trim() === "" || ogImage.includes("tisgonews.com")) {
        ogImage = `${protocol}://${host}/news-icon.png`;
      } else if (ogImage.startsWith("//")) {
        ogImage = `https:${ogImage}`;
      } else if (ogImage.startsWith("/")) {
        ogImage = `${protocol}://${host}${ogImage}`;
      }

      const metaTags = `
        <title>${ogTitle}</title>
        <meta property="og:title" content="${ogTitle}" />
        <meta property="og:description" content="${ogDesc}" />
        <meta property="og:image" content="${ogImage}" />
        <meta property="og:image:secure_url" content="${ogImage}" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${fullUrl}" />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Tisgo News" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${ogTitle}" />
        <meta name="twitter:description" content="${ogDesc}" />
        <meta name="twitter:image" content="${ogImage}" />
      `;

      if (html.includes("</head>")) {
        // Limpa a tag title original para não duplicar, cobrindo quebras de linha
        html = html.replace(/<title>[\s\S]*?<\/title>/i, "");
        html = html.replace("</head>", `${metaTags}</head>`);
      } else {
        html = `<head>${metaTags}</head>` + html;
      }

      res.status(200).set({ 
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300" 
      }).send(html);
    } catch (err) {
      console.error("[SSR Open Graph Universal ERROR]", err);
      next();
    }
  });

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
