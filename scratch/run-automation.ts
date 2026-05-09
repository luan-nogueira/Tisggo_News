import { automateNews } from "../server/automation";
import "dotenv/config";

async function run() {
  console.log("🚀 Iniciando automação manual...");
  try {
    const results = await automateNews();
    console.log("✅ Automação concluída com sucesso!");
    console.table(results);
  } catch (error) {
    console.error("❌ Falha na automação:", error);
  }
}

run();
