import { cleanupExistingArticles } from "../automation.js";

async function runCleanup() {
  console.log("🧹 Removendo assinaturas residuais (GE/G1) das notícias...");
  const count = await cleanupExistingArticles();
  console.log(`✅ Sucesso! ${count} notícias foram limpas e atualizadas.`);
}

runCleanup();
