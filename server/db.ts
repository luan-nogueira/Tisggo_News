import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDoc,
  Timestamp,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { ENV } from './_core/env';
import type { User, Article, Category, InsertUser, InsertArticle, InsertCategory } from "../drizzle/schema";

// Initialize Firebase
const app = initializeApp(ENV.firebase);
const db = getFirestore(app);

// Helper to convert Firestore data to our types
const toData = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export async function getDb() {
  return db;
}

// USERS
export async function getUserByOpenId(openId: string): Promise<User | null> {
  const q = query(collection(db, "users"), where("openId", "==", openId), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return toData<User>(snapshot.docs[0]);
}

export async function upsertUser(user: Partial<InsertUser> & { openId: string }): Promise<void> {
  const existing = await getUserByOpenId(user.openId);
  const data = {
    ...user,
    updatedAt: Timestamp.now(),
    lastSignedIn: Timestamp.now(),
  };

  if (existing) {
    await updateDoc(doc(db, "users", String(existing.id)), data);
  } else {
    await addDoc(collection(db, "users"), {
      ...data,
      createdAt: Timestamp.now(),
      role: user.role || "user",
    });
  }
}

// ARTICLES
export async function getArticles(pageSize = 10, offset = 0) {
  // Firestore pagination is different, but for now we'll do a simple query
  const q = query(
    collection(db, "articles"), 
    where("published", "==", true),
    orderBy("publishedAt", "desc"), 
    limit(pageSize)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toData<Article>);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const q = query(collection(db, "articles"), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return toData<Article>(snapshot.docs[0]);
}

export async function createArticle(article: any) {
  const docRef = await addDoc(collection(db, "articles"), {
    ...article,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    publishedAt: article.publishedAt ? Timestamp.fromDate(new Date(article.publishedAt)) : Timestamp.now(),
    views: 0,
  });
  return { id: docRef.id };
}

export async function updateArticle(id: string, article: Partial<Article>) {
  const data: any = { ...article, updatedAt: Timestamp.now() };
  if (article.publishedAt) {
    data.publishedAt = Timestamp.fromDate(new Date(article.publishedAt));
  }
  await updateDoc(doc(db, "articles", id), data);
}

export async function incrementArticleViews(id: string) {
  const articleRef = doc(db, "articles", id);
  const articleSnap = await getDoc(articleRef);
  if (articleSnap.exists()) {
    const currentViews = articleSnap.data().views || 0;
    await updateDoc(articleRef, { views: currentViews + 1 });
  }
}

export async function getArticlesByCategory(categoryId: string, pageSize = 20, offset = 0, orderByField: "recent" | "popular" = "recent") {
  const q = query(
    collection(db, "articles"),
    where("categoryId", "==", categoryId),
    where("published", "==", true),
    orderBy(orderByField === "recent" ? "publishedAt" : "views", "desc"),
    limit(pageSize)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toData<Article>);
}

export async function searchArticles(searchTerm: string) {
  // Firestore doesn't support native full-text search, so we'll do a simple client-side filter
  // For a production site, Algolia or similar would be better.
  const q = query(collection(db, "articles"), where("published", "==", true), limit(50));
  const snapshot = await getDocs(q);
  const articles = snapshot.docs.map(toData<Article>);
  const term = searchTerm.toLowerCase();
  return articles.filter(a => 
    a.title.toLowerCase().includes(term) || 
    a.content.toLowerCase().includes(term) ||
    a.excerpt?.toLowerCase().includes(term)
  );
}

// CATEGORIES
export async function getCategories() {
  const q = query(collection(db, "categories"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toData<Category>);
}

export async function createCategory(category: Partial<InsertCategory>) {
  const docRef = await addDoc(collection(db, "categories"), {
    ...category,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return { id: docRef.id };
}

export async function updateCategory(id: string, data: Partial<Category>) {
  await updateDoc(doc(db, "categories", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}

// Extra methods for Admin
export async function getAllArticlesAdmin() {
  const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toData<Article>);
}

export async function deleteArticle(id: string) {
  await deleteDoc(doc(db, "articles", id));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const docSnap = await getDoc(doc(db, "articles", id));
  if (!docSnap.exists()) return null;
  return toData<Article>(docSnap);
}
