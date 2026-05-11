
const admin = require("firebase-admin");
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID || "tisggo-news";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@tisggo-news.iam.gserviceaccount.com";
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!privateKey) {
  console.error("FIREBASE_PRIVATE_KEY is missing");
  process.exit(1);
}

// PEM repair
privateKey = privateKey.replace(/\\n/g, '\n');
if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = admin.firestore();

async function diagnose() {
  const catsSnap = await db.collection('categories').get();
  const categories = {};
  catsSnap.forEach(doc => {
    categories[doc.id] = doc.data().name;
    console.log(`ID: ${doc.id} | Name: ${doc.data().name}`);
  });

  const artsSnap = await db.collection('articles').limit(100).get();
  console.log(`\nSample of 100 articles:`);
  artsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Title: ${data.title.substring(0, 50)}... | Current Cat: ${categories[data.categoryId] || data.categoryId}`);
  });
}

diagnose().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
