import * as db from "../db.js";

async function purgeFallbackArticles() {
  console.log("🧹 Removendo notícias com foto genérica para re-importação...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentImage = data.coverImage || "";
      
      // Se for foto do Unsplash (fallback) e for de hoje (9 de maio)
      if (currentImage.includes("unsplash.com")) {
        await doc.ref.delete();
        count++;
        console.log(`🗑️ Deletada: ${data.title}`);
      }
    }

    console.log(`\n✅ ${count} notícias removidas. O robô irá re-importá-las com as fotos originais agora.`);
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

purgeFallbackArticles();
