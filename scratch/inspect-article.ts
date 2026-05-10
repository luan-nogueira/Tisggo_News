
import { getDb } from "../server/db.js";

async function inspectArticle() {
  const db = getDb();
  if ((db as any).error) {
    console.error("DB Error:", (db as any).error);
    return;
  }

  const slug = "mensagens-atribuidas-a-bacellar-citam-repasses-obra-parada-e-pressao-contra-campos";
  const snapshot = await db.collection('articles').where('slug', '==', slug).get();
  
  if (snapshot.empty) {
    console.log("Article not found!");
    return;
  }

  const doc = snapshot.docs[0];
  const article = doc.data();
  console.log("=== ARTICLE INSPECTION ===");
  console.log("ID:", doc.id);
  console.log("Title:", article.title);
  console.log("Cover Image:", article.coverImage);
  console.log("--- Content ---");
  console.log(article.content);
  console.log("--- Excerpt ---");
  console.log(article.excerpt);
}

inspectArticle().catch(console.error);
