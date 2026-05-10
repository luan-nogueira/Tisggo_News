import * as db from "../db.js";
import admin from "firebase-admin";

const STOP_WORDS = [
  /Um post compartilhado por/gi,
  /Leia também:/gi,
  /Veja também:/gi,
  /Confira abaixo:/gi,
  /Aviso importante:/gi,
  /A programação organizada pela/gi,
  /O vereador de Campos/gi,
  /A concessionária Águas do Paraíba/gi,
  /A fabricante Ypê/gi
];

async function run() {
  console.log("[Manutenção] Iniciando validação de conteúdo retroativo...");
  try {
    const firestore = await db.getDb();
    if ((firestore as any).error) throw new Error("DB not initialized");

    const snapshot = await firestore.collection("articles").get();
    console.log(`[Manutenção] Analisando ${snapshot.size} notícias...`);

    let cleanedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      const originalContent = content;
      
      // Quebrar em parágrafos para simular a lógica do robô
      const paragraphs = content.split(/<\/p>/i);
      let newContent = "";
      let stopped = false;

      for (let p of paragraphs) {
        const cleanP = p.replace(/<p>/i, "").trim();
        if (!cleanP) continue;
        
        const textOnly = cleanP.replace(/<[^>]*>/g, '').trim();
        
        for (const regex of STOP_WORDS) {
          if (regex.test(textOnly)) {
            stopped = true;
            break;
          }
        }
        
        if (stopped) break;
        newContent += `<p>${cleanP}</p>\n`;
      }

      if (newContent.trim() !== originalContent.trim()) {
        console.log(`[Manutenção] ✅ Conteúdo limpo: "${data.title.substring(0, 50)}..."`);
        await doc.ref.update({ 
          content: newContent,
          updatedAt: admin.firestore.Timestamp.now()
        });
        cleanedCount++;
      }
    }

    console.log(`[Manutenção] Sucesso! ${cleanedCount} notícias foram validadas e limpas.`);
    process.exit(0);
  } catch (error: any) {
    console.error("[Manutenção] Erro fatal:", error.message);
    process.exit(1);
  }
}

run();
