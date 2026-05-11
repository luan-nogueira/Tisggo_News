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

      let finalProjectId = projectId;
      let finalClientEmail = clientEmail;
      let finalPrivateKey = privateKey.trim();

      // SMART JSON AUTO-DETECTION (Improved)
      if (finalPrivateKey.startsWith('{')) {
        try {
          console.log("[Firebase] Attempting to parse FIREBASE_PRIVATE_KEY as JSON...");
          const config = JSON.parse(finalPrivateKey);
          finalProjectId = config.project_id || finalProjectId;
          finalClientEmail = config.client_email || finalClientEmail;
          finalPrivateKey = config.private_key || finalPrivateKey;
          console.log("[Firebase] JSON parsed successfully for project:", finalProjectId);
        } catch (e: any) {
          console.error("[Firebase] JSON parse failed:", e.message);
        }
      }

      // ULTRA-ROBUST PEM REPAIR
      let formattedKey = finalPrivateKey.trim();
      
      // Remove any literal quotes that might have been pasted
      formattedKey = formattedKey.replace(/^['"]|['"]$/g, '');

      // Fix double-escaped or literal \n
      formattedKey = formattedKey.replace(/\\n/g, '\n');

      // Final check for headers
      if (!formattedKey.includes("-----BEGIN PRIVATE KEY-----")) {
        console.log("[Firebase] Adding missing PEM headers...");
        formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
      }

      // Log key structure for debugging (safe version)
      console.log(`[Firebase] Key starts with: ${formattedKey.substring(0, 30)}...`);
      console.log(`[Firebase] Key ends with: ...${formattedKey.substring(formattedKey.length - 30)}`);

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: finalProjectId,
          clientEmail: finalClientEmail,
          privateKey: formattedKey,
        }),
        storageBucket: `${finalProjectId}.firebasestorage.app`
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
  const data = doc.data() || {};
  
  // Converte Firestore Timestamps para strings ISO legíveis pelo frontend
  const converted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
      converted[key] = (value as admin.firestore.Timestamp).toDate().toISOString();
    } else {
      converted[key] = value;
    }
  }
  
  return { id: doc.id, ...converted } as T;
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
    console.error("[Firebase] ERROR fetching articles by category:", error.message);
    
    // FALLBACK: If orderBy fails (likely due to missing index), try without it
    try {
      console.log("[Firebase] Attempting fallback query without orderBy...");
      const db = ensureDb();
      const snapshot = await db.collection("articles")
        .where("categoryId", "==", categoryId)
        .limit(limit)
        .get();
      
      const articles = snapshot.docs.map(toData<Article>);
      // Sort in memory as a temporary fix
      return articles.sort((a: any, b: any) => {
        const dateA = a.publishedAt ? (a.publishedAt.toDate?.() || new Date(a.publishedAt)).getTime() : 0;
        const dateB = b.publishedAt ? (b.publishedAt.toDate?.() || new Date(b.publishedAt)).getTime() : 0;
        return dateB - dateA;
      });
    } catch (fallbackError: any) {
      console.error("[Firebase] Fallback query also failed:", fallbackError.message);
      return [];
    }
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

// STORAGE HELPERS
export async function uploadImageToStorage(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const bucket = getStorage().bucket();
  const file = bucket.file(fileName);
  
  await file.save(buffer, {
    metadata: { contentType },
    public: true
  });

  // Make it public and return URL
  // Note: For Firebase Admin, we can use the simple URL format if bucket is public
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

export async function deleteFromStorage(url: string) {
  try {
    if (!url || !url.includes("storage.googleapis.com")) return;
    
    const bucket = getStorage().bucket();
    const parts = url.split(`${bucket.name}/`);
    if (parts.length < 2) return;
    
    const fileName = parts[1];
    await bucket.file(fileName).delete();
    console.log("[Firebase] Image deleted from storage:", fileName);
  } catch (error: any) {
    console.error("[Firebase] Error deleting from storage:", error.message);
  }
}

// BLACKLIST
export async function blacklistUrl(url: string) {
  try {
    const db = ensureDb();
    // Use URL as document ID to avoid duplicates and allow easy checking
    // We sanitize the URL to use as ID (replace non-alphanumeric with _)
    const sanitizedId = Buffer.from(url).toString('base64');
    await db.collection("deleted_urls").doc(sanitizedId).set({
      url,
      deletedAt: admin.firestore.Timestamp.now()
    });
    console.log("[Firebase] URL blacklisted:", url);
  } catch (error: any) {
    console.error("[Firebase] ERROR blacklisting URL:", error.message);
  }
}

export async function isUrlBlacklisted(url: string): Promise<boolean> {
  try {
    const db = ensureDb();
    const sanitizedId = Buffer.from(url).toString('base64');
    const doc = await db.collection("deleted_urls").doc(sanitizedId).get();
    return doc.exists;
  } catch (error: any) {
    console.error("[Firebase] ERROR checking blacklist:", error.message);
    return false;
  }
}

// USER FUNCTIONS
export async function getUserByOpenId(openId: string) {
  const db = ensureDb();
  const snapshot = await db.collection("users").where("openId", "==", openId).get();
  if (snapshot.empty) return null;
  return toData<any>(snapshot.docs[0]);
}

export async function upsertUser(data: any) {
  const db = ensureDb();
  const user = await getUserByOpenId(data.openId);
  if (user) {
    await db.collection("users").doc(user.id).update({
      ...data,
      updatedAt: admin.firestore.Timestamp.now()
    });
    return { id: user.id };
  } else {
    const docRef = await db.collection("users").add({
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    return { id: docRef.id };
  }
}
