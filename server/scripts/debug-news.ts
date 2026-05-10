import * as db from "../db.js";

async function listNews() {
  const firestore = await db.getDb();
  const snapshot = await firestore.collection("articles").orderBy("publishedAt", "desc").limit(10).get();
  
  console.log("--- ÚLTIMAS 10 NOTÍCIAS NO BANCO ---");
  snapshot.docs.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id} | Titulo: ${d.title.substring(0, 40)}... | Data: ${d.publishedAt} | Conteudo (início): ${d.content?.substring(0, 100)}`);
  });
}

listNews();
