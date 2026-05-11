import * as db from "../db.js";

async function deepCleanup() {
  console.log("🚀 Iniciando faxina AGRESSIVA no banco de dados...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let deletedCount = 0;
    const batch = firestore.batch();

    console.log(`🔍 Analisando ${snapshot.size} notícias...`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let shouldDelete = false;

      const title = (data.title || "").toLowerCase();
      const content = (data.content || "").toLowerCase();

      // 1. Verificar se menciona 2024 no título (ex: Paris 2024)
      if (title.includes("2024")) {
        console.log(`🗑️ Deletando por título: ${data.title}`);
        shouldDelete = true;
      }

      // 2. Verificar se o conteúdo parece ser de 2024
      if (content.includes("09/05/2024") || content.includes("10/05/2024")) {
        console.log(`🗑️ Deletando por conteúdo (data): ${data.title}`);
        shouldDelete = true;
      }

      // 3. Notícias "históricas" ou genéricas que o usuário não quer
      if (title.includes("conheça a história") || title.includes("bom dia brasil")) {
        console.log(`🗑️ Deletando por ser conteúdo genérico/antigo: ${data.title}`);
        shouldDelete = true;
      }

      if (shouldDelete) {
        batch.delete(doc.ref);
        deletedCount++;
        if (deletedCount % 400 === 0) {
            await batch.commit();
        }
      }
    }

    if (deletedCount > 0 && deletedCount % 400 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Faxina concluída! ${deletedCount} notícias removidas.`);
  } catch (error) {
    console.error("❌ Erro durante a faxina:", error);
  }
}

deepCleanup();
