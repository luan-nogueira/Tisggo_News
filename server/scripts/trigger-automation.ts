import { automateNews } from "../automation.js";

async function trigger() {
  console.log("🤖 Iniciando robô atualizado (Foco: GE e Notícias de Hoje)...");
  const result = await automateNews();
  console.log("🏁 Robô finalizou!", result);
}

trigger();
