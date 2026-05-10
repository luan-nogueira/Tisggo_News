import * as db from "../db.js";

async function listUrls() {
  const firestore = await db.getDb();
  const snapshot = await firestore.collection("articles").orderBy("createdAt", "desc").limit(20).get();
  
  console.log("🔗 URLS RECENTES:");
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.title}`);
    console.log(`  SOURCE: ${data.sourceUrl}`);
  });
}

listUrls();
