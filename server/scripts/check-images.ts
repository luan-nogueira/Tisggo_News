import * as db from "../db.js";

async function checkImages() {
  const firestore = await db.getDb();
  const snapshot = await firestore.collection("articles").orderBy("createdAt", "desc").limit(10).get();
  
  console.log("📸 VERIFICAÇÃO DE IMAGENS RECENTES:");
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- [${data.coverImage?.includes('unsplash') ? '❌ FALLBACK' : '✅ ORIGINAL'}] ${data.title}`);
    console.log(`  URL: ${data.coverImage}`);
  });
}

checkImages();
