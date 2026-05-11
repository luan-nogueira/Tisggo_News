
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore();

async function inspectArticle() {
  const slug = "mensagens-atribuidas-a-bacellar-citam-repasses-obra-parada-e-pressao-contra-campos";
  const snapshot = await db.collection('articles').where('slug', '==', slug).get();
  
  if (snapshot.empty) {
    console.log("Article not found!");
    return;
  }

  const article = snapshot.docs[0].data();
  console.log("=== ARTICLE INSPECTION ===");
  console.log("Title:", article.title);
  console.log("Cover Image:", article.coverImage);
  console.log("--- Content ---");
  console.log(article.content);
  console.log("--- Excerpt ---");
  console.log(article.excerpt);
}

inspectArticle().catch(console.error);
