import admin from "firebase-admin";
import { ENV } from './_core/env.js';
import type { User, Article, Category, InsertUser, InsertArticle, InsertCategory } from "../drizzle/schema";

let dbInstance: admin.firestore.Firestore | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  if (!admin.apps.length) {
    try {
      let configValue = process.env.FIREBASE_PRIVATE_KEY;
      let finalConfig: any = {
        projectId: process.env.FIREBASE_PROJECT_ID || "tisggo-news",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@tisggo-news.iam.gserviceaccount.com",
        privateKey: configValue
      };

      if (configValue) {
        configValue = configValue.trim();
        // Check if user pasted the entire JSON file
        if (configValue.startsWith('{')) {
          try {
            const jsonConfig = JSON.parse(configValue);
            finalConfig.projectId = jsonConfig.project_id;
            finalConfig.clientEmail = jsonConfig.client_email;
            finalConfig.privateKey = jsonConfig.private_key;
            console.log("[Firebase] Detected full JSON config string.");
          } catch (e) {
            console.warn("[Firebase] String starts with { but is not valid JSON, treating as raw key.");
          }
        }

        // Standard cleanup for the private key
        if (finalConfig.privateKey) {
          if (finalConfig.privateKey.startsWith('"') && finalConfig.privateKey.endsWith('"')) {
            finalConfig.privateKey = finalConfig.privateKey.substring(1, finalConfig.privateKey.length - 1);
          }
          finalConfig.privateKey = finalConfig.privateKey.replace(/\\n/g, '\n');
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(finalConfig),
        databaseURL: `https://${finalConfig.projectId}.firebaseio.com`,
      });
      console.log("[Firebase] Admin initialized successfully");
    } catch (error: any) {
      console.error("[Firebase] Admin initialization error:", error.message);
      throw new Error(`Firebase Init Failed: ${error.message}`);
    }
  }
  
  dbInstance = admin.firestore();
  return dbInstance;
}
const storage = admin.storage();

export async function firebaseUpload(path: string, buffer: Buffer, contentType: string) {
  const bucket = storage.bucket();
  const file = bucket.file(path);
  
  await file.save(buffer, {
    metadata: { contentType },
    public: true
  });

  // Torna o arquivo público e retorna a URL
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

// Helper to convert Firestore data to our types
// Helper to convert Firestore data to our types and format Timestamps
const toData = <T>(doc: any): T => {
  const data = doc.data();
  // Convert all Timestamps to ISO strings for the frontend
  for (const key in data) {
    if (data[key] && typeof data[key] === 'object' && 'seconds' in data[key]) {
      data[key] = data[key].toDate().toISOString();
    }
  }
  return { id: doc.id, ...data } as T;
};

// USERS
export async function getUserByOpenId(openId: string): Promise<User | null> {
  const db = getDb();
  const snapshot = await db.collection("users").where("openId", "==", openId).limit(1).get();
  if (snapshot.empty) return null;
  return toData<User>(snapshot.docs[0]);
}

export async function upsertUser(user: Partial<InsertUser> & { openId: string }): Promise<void> {
  const db = getDb();
  const existing = await getUserByOpenId(user.openId);
  const data = {
    ...user,
    updatedAt: admin.firestore.Timestamp.now(),
    lastSignedIn: admin.firestore.Timestamp.now(),
  };

  if (existing) {
    await db.collection("users").doc(String(existing.id)).update(data);
  } else {
    await db.collection("users").add({
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
      role: user.role || "user",
    });
  }
}

// ARTICLES
export async function getArticles(pageSize = 20) {
  console.log("[Firebase] Fetching articles (limit:", pageSize, ")...");
  try {
    // Try the ideal query first
    const db = getDb();
    const snapshot = await db.collection("articles")
      .where("published", "==", true)
      .orderBy("publishedAt", "desc")
      .limit(pageSize)
      .get();
    
    console.log("[Firebase] Articles found (ordered):", snapshot.size);
    return snapshot.docs.map(toData<Article>);
  } catch (error: any) {
    console.error("[Firebase] ERROR fetching articles:", error.message);
    
    // EMERGENCY FALLBACK: Just get everything without filters/ordering
    try {
      console.warn("[Firebase] Trying emergency fallback query...");
      const db = getDb();
      const fallbackSnapshot = await db.collection("articles").limit(pageSize).get();
      console.log("[Firebase] Fallback articles found:", fallbackSnapshot.size);
      
      if (fallbackSnapshot.empty) {
        return [{
          id: "debug-error",
          title: "Atenção: Erro de Conexão com o Banco",
          content: `O banco de dados respondeu: ${error.message}. Verifique as chaves do Firebase na Vercel.`,
          excerpt: error.message,
          published: true,
          coverImage: "",
          categoryId: "error",
          authorId: "system",
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          views: 0,
          slug: "erro-conexao"
        }] as any[];
      }
      
      return fallbackSnapshot.docs.map(toData<Article>);
    } catch (fallbackError: any) {
      console.error("[Firebase] CRITICAL: Fallback also failed:", fallbackError.message);
      return [{
        id: "debug-error-critical",
        title: "Erro Crítico de Inicialização",
        content: `Falha total: ${fallbackError.message}. Verifique se o FIREBASE_PRIVATE_KEY está completo na Vercel.`,
        excerpt: fallbackError.message,
        published: true,
        coverImage: "",
        categoryId: "error",
        authorId: "system",
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        slug: "erro-critico"
      }] as any[];
    }
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = getDb();
  // Tenta por slug
  const snapshot = await db.collection("articles").where("slug", "==", slug).limit(1).get();
  if (!snapshot.empty) return toData<Article>(snapshot.docs[0]);
  
  // Se falhar, tenta por ID (caso o slug seja o ID ou o slug esteja faltando no link)
  try {
    const docSnap = await db.collection("articles").doc(slug).get();
    if (docSnap.exists) return toData<Article>(docSnap);
  } catch (e) {
    // Silently fail if slug is not a valid doc id format
  }
  
  return null;
}

export async function createArticle(article: any) {
  const db = getDb();
  console.log("[Firebase] Attempting to create article:", article.title);
  const data = {
    ...article,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    publishedAt: (article.publishedAt && !isNaN(new Date(article.publishedAt).getTime())) 
      ? admin.firestore.Timestamp.fromDate(new Date(article.publishedAt)) 
      : admin.firestore.Timestamp.now(),
    views: 0,
  };
  try {
    const docRef = await db.collection("articles").add(data);
    console.log("[Firebase] Article created successfully with ID:", docRef.id);
    return { id: docRef.id };
  } catch (error) {
    console.error("[Firebase] Error creating article:", error);
    throw error;
  }
}

export async function updateArticle(id: string, article: Partial<Article>) {
  const db = getDb();
  const { id: _, ...updateData } = article as any;
  const data: any = { ...updateData, updatedAt: admin.firestore.Timestamp.now() };
  if (article.publishedAt && !isNaN(new Date(article.publishedAt).getTime())) {
    data.publishedAt = admin.firestore.Timestamp.fromDate(new Date(article.publishedAt));
  }
  await db.collection("articles").doc(id).update(data);
}

export async function incrementArticleViews(id: string) {
  const db = getDb();
  const articleRef = db.collection("articles").doc(id);
  await articleRef.update({
    views: admin.firestore.FieldValue.increment(1)
  });
}

export async function getArticlesByCategory(categoryId: string, limitCount: number = 10, offset: number = 0, orderBy: string = "recent") {
  const db = getDb();
  console.log("[Firebase] Fetching articles for category ID:", categoryId, "(limit:", limitCount, ")");
  try {
    let query = db.collection("articles")
      .where("categoryId", "==", categoryId)
      .where("published", "==", true);
    
    // Tentativa de busca
    const snapshot = await query.get();
    console.log("[Firebase] Total articles found for this category (ignoring order):", snapshot.size);
    
    if (orderBy === "popular") {
      query = query.orderBy("views", "desc");
    } else {
      query = query.orderBy("publishedAt", "desc");
    }
    
    const orderedSnapshot = await query.limit(limitCount).offset(offset).get();
    console.log("[Firebase] Ordered articles found:", orderedSnapshot.size);
    return orderedSnapshot.docs.map(toData<Article>);
  } catch (error: any) {
    console.error("[Firebase] Error fetching articles by category:", error.message);
    // Fallback se faltar índice
    const fallbackSnapshot = await db.collection("articles")
      .where("categoryId", "==", categoryId)
      .where("published", "==", true)
      .limit(limitCount)
      .get();
    console.log("[Firebase] Fallback articles found:", fallbackSnapshot.size);
    return fallbackSnapshot.docs.map(toData<Article>);
  }
}

export async function searchArticles(searchTerm: string) {
  const db = getDb();
  const snapshot = await db.collection("articles").where("published", "==", true).limit(50).get();
  const articles = snapshot.docs.map(toData<Article>);
  const term = searchTerm.toLowerCase();
  return articles.filter(a => 
    a.title.toLowerCase().includes(term) || 
    a.content.toLowerCase().includes(term)
  );
}

// CATEGORIES
export async function getCategories() {
  const db = getDb();
  console.log("[Firebase] Fetching categories...");
  try {
    const snapshot = await db.collection("categories").orderBy("name", "asc").get();
    console.log("[Firebase] Categories fetched:", snapshot.size);
    return snapshot.docs.map(toData<Category>);
  } catch (error) {
    console.error("[Firebase] Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(category: Partial<InsertCategory>) {
  const db = getDb();
  const docRef = await db.collection("categories").add({
    ...category,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  return { id: docRef.id };
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const db = getDb();
  await db.collection("categories").doc(id).update({
    ...data,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteCategory(id: string) {
  const db = getDb();
  await db.collection("categories").doc(id).delete();
}

// Extra methods for Admin
export async function getAllArticlesAdmin() {
  const db = getDb();
  const snapshot = await db.collection("articles").orderBy("createdAt", "desc").get();
  return snapshot.docs.map(toData<Article>);
}

export async function deleteArticle(id: string) {
  const db = getDb();
  await db.collection("articles").doc(id).delete();
}

export async function getArticleById(id: string): Promise<Article | null> {
  const db = getDb();
  const docSnap = await db.collection("articles").doc(id).get();
  if (!docSnap.exists) return null;
  return toData<Article>(docSnap);
}
