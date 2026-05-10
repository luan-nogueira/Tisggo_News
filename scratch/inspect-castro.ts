
import { getDb } from "../server/db.js";

async function inspectArticle() {
  const db = getDb();
  if ((db as any).error) {
    console.error("DB Error:", (db as any).error);
    return;
  }

  const slug = "claudio-castro-domina-o-tribunal-de-contas-do-estado-do-rio-de-janeiro";
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
  console.log("--- Content ---");
  console.log(article.content);
}

inspectArticle().catch(console.error);
