import admin from "firebase-admin";
import { type InsertArticle, type Article, type Category, type InsertCategory } from "../drizzle/schema.js";

let dbInstance: admin.firestore.Firestore | null = null;

export function getDb() {
  if (dbInstance && !(dbInstance as any).error) return dbInstance;

  try {
    if (admin.apps.length === 0) {
      console.log("[Firebase] Initializing Admin SDK...");
      
      const projectId = process.env.FIREBASE_PROJECT_ID || "tisggo-news";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@tisggo-news.iam.gserviceaccount.com";
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is missing from environment variables");
      }

      // Handle common formatting issues with private keys in environment variables
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
      
      // Convert literal \n to actual newlines if present
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: `${projectId}.firebasestorage.app`
      });
      console.log("[Firebase] Admin SDK initialized successfully.");
    }
    
    dbInstance = admin.firestore();
    // Test connection
    console.log("[Firebase] Firestore connection established.");
    return dbInstance;
  } catch (error: any) {
    console.error("[Firebase] CRITICAL initialization error:", error.message);
    // Return a proxy that throws on access to help debugging
    dbInstance = { error: error.message } as any;
    return dbInstance;
  }
}

export function getStorage() {
  if (admin.apps.length === 0) {
    getDb();
  }
  return admin.storage();
}

function toData<T>(doc: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot): T {
  return { id: doc.id, ...doc.data() } as T;
}

// Helper to ensure we have a valid DB instance or throw clear error
function ensureDb() {
  const db = getDb();
  if ((db as any).error) {
    throw new Error(`Firebase not initialized: ${(db as any).error}`);
  }
  return db as admin.firestore.Firestore;
}

// ARTICLES
export async function getArticles(pageSize = 20) {
  console.log("[Firebase] Fetching articles...");
  try {
    const db = ensureDb();
    const snapshot = await db.collection("articles")
      .orderBy("publishedAt", "desc")
      .limit(pageSize)
      .get();
    
    return snapshot.docs.map(toData<Article>);
  } catch (error: any) {
    console.error("[Firebase] ERROR fetching articles:", error.message);
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const db = ensureDb();
    const snapshot = await db.collection("articles").where("slug", "==", slug).limit(1).get();
    if (!snapshot.empty) return toData<Article>(snapshot.docs[0]);
    
    // Fallback to ID
    try {
      const docSnap = await db.collection("articles").doc(slug).get();
      if (docSnap.exists) return toData<Article>(docSnap);
    } catch (e) {}
    
    return null;
  } catch (error: any) {
    console.error("[Firebase] ERROR fetching article by slug:", error.message);
    return null;
  }
}

export async function createArticle(article: any) {
  const db = ensureDb();
  console.log("[Firebase] Creating article:", article.title);
  const data = {
    ...article,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    publishedAt: (article.publishedAt && !isNaN(new Date(article.publishedAt).getTime())) 
      ? admin.firestore.Timestamp.fromDate(new Date(article.publishedAt)) 
      : admin.firestore.Timestamp.now(),
    views: article.views || 0,
  };
  const docRef = await db.collection("articles").add(data);
  return { id: docRef.id };
}

export async function updateArticle(id: string, article: Partial<InsertArticle>) {
  const db = ensureDb();
  await db.collection("articles").doc(id).update({
    ...article,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteArticle(id: string) {
  const db = ensureDb();
  await db.collection("articles").doc(id).delete();
}

export async function incrementArticleViews(id: string) {
  try {
    const db = ensureDb();
    await db.collection("articles").doc(id).update({
      views: admin.firestore.FieldValue.increment(1)
    });
  } catch (e) {}
}

export async function getArticlesByCategory(categoryId: string, limit = 20, offset = 0, orderBy: "recent" | "popular" = "recent") {
  try {
    const db = ensureDb();
    let query = db.collection("articles").where("categoryId", "==", categoryId);
    
    if (orderBy === "popular") {
      query = query.orderBy("views", "desc");
    } else {
      query = query.orderBy("publishedAt", "desc");
    }

    const snapshot = await query.limit(limit).get();
    return snapshot.docs.map(toData<Article>);
  } catch (error: any) {
    return [];
  }
}

export async function searchArticles(searchTerm: string) {
  try {
    const db = ensureDb();
    const snapshot = await db.collection("articles").limit(50).get();
    const articles = snapshot.docs.map(toData<Article>);
    return articles.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    return [];
  }
}

// CATEGORIES
export async function getCategories(): Promise<Category[]> {
  try {
    const db = ensureDb();
    const snapshot = await db.collection("categories").orderBy("name", "asc").get();
    return snapshot.docs.map(toData<Category>);
  } catch (error: any) {
    console.error("[Firebase] ERROR fetching categories:", error.message);
    return [];
  }
}

export async function createCategory(category: Partial<InsertCategory>) {
  const db = ensureDb();
  const docRef = await db.collection("categories").add({
    ...category,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  return { id: docRef.id };
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const db = ensureDb();
  await db.collection("categories").doc(id).update({
    ...data,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteCategory(id: string) {
  const db = ensureDb();
  await db.collection("categories").doc(id).delete();
}

export async function getArticleById(id: string): Promise<Article | null> {
  const db = ensureDb();
  const docSnap = await db.collection("articles").doc(id).get();
  if (!docSnap.exists) return null;
  return toData<Article>(docSnap);
}

export async function getAllArticlesAdmin() {
  const db = ensureDb();
  const snapshot = await db.collection("articles").orderBy("createdAt", "desc").get();
  return snapshot.docs.map(toData<Article>);
}
