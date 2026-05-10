import * as db from "../db.js";

async function purgeEmptyArticles() {
  console.log("🧹 Removendo notícias vazias para re-importação limpa...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const content = data.content || "";
      
      // Se o conteúdo tiver menos de 300 caracteres, deleta para o robô pegar de novo
      if (content.length < 300) {
        await doc.ref.delete();
        count++;
        console.log(`🗑️ Deletada (Vazia/Curta): ${data.title}`);
      }
    }

    console.log(`\n✅ ${count} notícias removidas. O robô irá re-importá-las AGORA com o novo filtro.`);
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

purgeEmptyArticles();
