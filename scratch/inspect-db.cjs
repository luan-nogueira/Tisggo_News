
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!privateKey) {
  console.error("FIREBASE_PRIVATE_KEY is missing!");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore();

async function listCategories() {
  const categoriesSnapshot = await db.collection('categories').get();
  console.log("=== CATEGORIES ===");
  categoriesSnapshot.forEach(doc => {
    console.log(`ID: ${doc.id} | Name: ${doc.data().name} | Slug: ${doc.data().slug}`);
  });

  const articlesSnapshot = await db.collection('articles').limit(5).get();
  console.log("\n=== LATEST 5 ARTICLES ===");
  articlesSnapshot.forEach(doc => {
    console.log(`Title: ${doc.data().title.substring(0, 30)}... | CategoryId: ${doc.data().categoryId}`);
  });
}

listCategories().catch(console.error);
