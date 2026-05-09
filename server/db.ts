import * as admin from "firebase-admin";
import { ENV } from './_core/env';
import type { User, Article, Category, InsertUser, InsertArticle, InsertCategory } from "../drizzle/schema";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "tisggo-news",
        clientEmail: "firebase-adminsdk-fbsvc@tisggo-news.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDZsycxeKQ5Z+E\nAd6QHq5Ef3xnfudLr9MfviBj6NStMdsoTTDVb8xYSOaAfZkgC3Q7T5wkaWoRMc2/\nJMOzottE3+tDX9+dIK483tGOHgWSSX2VXOxsCI/vr9as2j5FWBEPNbiahnHVClzk\n8vhf/0yEUAfrr/CSh6vPdQ6+IoXR1bka+t+c8BGvEmmyrnjEf3HaUFQmJXdIN35J\n6ZHte67uvJiiwtpyQVE0ip1x9bElE+j3mjWjQvoXny3Bn3DR0H+VGG85nwYPWfRj\ne7f5A3bo8A/2Dd15ie1ygxE8+gWW5K7lGYKBr0nzGAXo969Lzv4lDt1NBWmjcbcl\nvbFM2WmtAgMBAAECggEAJdn5zGuz3CQzDpALJElhMjEs8OJ/HSUB5Y3/ucLeQe+c\nt9WeHlZiE/8JMb5CxZeabCvbgB0weAS5CawuQdPMHG8w5HQDve0Y+38hQmGz7BbS\n3jZqMPJGqaRbFlBPjEDHSzY5nKtrDR0NCie77+KlWKMlKaWDGWtxH4aaNMA8wn0I\nkyIP8E/n31wQICA3WaOedu4/ePRp5tU3LbqJoDFZAqcQh2j8U12wlsL6O5VxQBHn\nj5G0dXfEHbrTUT7QTUn3gqOopj4qrNAZpjjownHPizWWyBSsGPg/JcAdelr0CWbL\nNz/FX/FwPDNwsOZv819XBoGO8GmqKuQ/9IXJxzN/iQKBgQDw2ewvlgZno/ndiMet\n3uGwlS2wHhFUlMWPXulaX8SeCNpaqfseh4sCWQXzNix3CY+ooRjAgyClc3l+bn/S\n7arAURQ16a83MbjhZPkX6+FM3yHPPDuqJ9PGHUnvDeYB846e5FTELQzQHj8ZLzSs\nh4vUM56TKPmjwsBxld+hEIrJJQKBgQDPsRD2/YD9Kcsb7ShYMO2chK+m00tBJnQy\nUhhfYorVwQP6wyVgK0KTq+62g0cQqwm8cGRoxBOEicruZPjRfIOUOzx7xzTcHAoY\nKkCGTbNP8W7+UvXSy+O20nzwWL2Rpekfp71/J4ELMsHjautCFrI29Swpxspufxm4\nNGi7cmjL6QKBgQCHSSFNqWt3k7eqJEZk96i101WSc5EwfVBrM9jHlruOOVLNUmVn\nxKLkcrTQ5EEdrBUxlyucFwujY7V+uvq5tB4RYHmFvvlYe2lp0ZnJQgmPcFZBXYf2\nD+D4i0MYMCpeNjyKK58hglyMGjE/KDDiKFD2pPgRmRaAUchfBNxUUEJksQKBgEan\njwTnUrVNPXp/oIT4CC2B+ht/sA823LqtsPrqFB8JrafmMVXZAaopCGlwmYFzHjnL\n5my5n4YsNiwJj5f8iuqniDj3mOT0aP61iQPndQPSN5cvc89Fa28rhjNhjQP6dCc/\nsjiKoNzFZK5QFj6CaBhIKcEAjqcud/pxYdu63SnZAoGAaEa7isZzCeIjtFQSdX3b\n3+nmearEgLbrGrUExvh5wf+E/7MS5ZqwwWXVkMgTJvo4zi/8/lUTyMUsWxesFps8\nNF+QCdD/uMRxLUCYQZ7CRY/qZ4tKTtFcOeXok7pUIoFRyt2THIYCC9vjhlWwKQoW\nFbOF7VHHhIo75kj05etUMrM=\n-----END PRIVATE KEY-----\n",
      }),
      databaseURL: `https://tisggo-news.firebaseio.com`
    });
    console.log("[Firebase] Admin initialized successfully");
  } catch (error) {
    console.error("[Firebase] Admin initialization error:", error);
  }
}

const db = admin.firestore();

// Helper to convert Firestore data to our types
const toData = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export async function getDb() {
  return db;
}

// USERS
export async function getUserByOpenId(openId: string): Promise<User | null> {
  const snapshot = await db.collection("users").where("openId", "==", openId).limit(1).get();
  if (snapshot.empty) return null;
  return toData<User>(snapshot.docs[0]);
}

export async function upsertUser(user: Partial<InsertUser> & { openId: string }): Promise<void> {
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
  const snapshot = await db.collection("articles")
    .where("published", "==", true)
    .orderBy("publishedAt", "desc")
    .limit(pageSize)
    .get();
  return snapshot.docs.map(toData<Article>);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const snapshot = await db.collection("articles").where("slug", "==", slug).limit(1).get();
  if (snapshot.empty) return null;
  return toData<Article>(snapshot.docs[0]);
}

export async function createArticle(article: any) {
  const data = {
    ...article,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    publishedAt: article.publishedAt ? admin.firestore.Timestamp.fromDate(new Date(article.publishedAt)) : admin.firestore.Timestamp.now(),
    views: 0,
  };
  const docRef = await db.collection("articles").add(data);
  return { id: docRef.id };
}

export async function updateArticle(id: string, article: Partial<Article>) {
  const data: any = { ...article, updatedAt: admin.firestore.Timestamp.now() };
  if (article.publishedAt) {
    data.publishedAt = admin.firestore.Timestamp.fromDate(new Date(article.publishedAt));
  }
  await db.collection("articles").doc(id).update(data);
}

export async function incrementArticleViews(id: string) {
  const articleRef = db.collection("articles").doc(id);
  await articleRef.update({
    views: admin.firestore.FieldValue.increment(1)
  });
}

export async function getArticlesByCategory(categoryId: string, pageSize = 20, offset = 0, orderByField: "recent" | "popular" = "recent") {
  const snapshot = await db.collection("articles")
    .where("categoryId", "==", categoryId)
    .where("published", "==", true)
    .orderBy(orderByField === "recent" ? "publishedAt" : "views", "desc")
    .limit(pageSize)
    .get();
  return snapshot.docs.map(toData<Article>);
}

export async function searchArticles(searchTerm: string) {
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
  const snapshot = await db.collection("categories").orderBy("name", "asc").get();
  return snapshot.docs.map(toData<Category>);
}

export async function createCategory(category: Partial<InsertCategory>) {
  const docRef = await db.collection("categories").add({
    ...category,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  return { id: docRef.id };
}

export async function updateCategory(id: string, data: Partial<Category>) {
  await db.collection("categories").doc(id).update({
    ...data,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteCategory(id: string) {
  await db.collection("categories").doc(id).delete();
}

// Extra methods for Admin
export async function getAllArticlesAdmin() {
  const snapshot = await db.collection("articles").orderBy("createdAt", "desc").get();
  return snapshot.docs.map(toData<Article>);
}

export async function deleteArticle(id: string) {
  await db.collection("articles").doc(id).delete();
}

export async function getArticleById(id: string): Promise<Article | null> {
  const docSnap = await db.collection("articles").doc(id).get();
  if (!docSnap.exists) return null;
  return toData<Article>(docSnap);
}
