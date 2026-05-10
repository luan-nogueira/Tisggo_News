import { cleanupExistingArticles } from "../automation.js";

async function runCleanup() {
  console.log("🧹 Corrigindo erros gramaticais e marcas residuais...");
  const count = await cleanupExistingArticles();
  console.log(`✅ Sucesso! ${count} notícias foram corrigidas.`);
}

runCleanup();
