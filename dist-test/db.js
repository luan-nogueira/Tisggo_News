"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createArticle: () => createArticle,
  createCategory: () => createCategory,
  deleteArticle: () => deleteArticle,
  deleteCategory: () => deleteCategory,
  getArticleById: () => getArticleById,
  getArticleBySlug: () => getArticleBySlug,
  getArticles: () => getArticles,
  getArticlesByCategory: () => getArticlesByCategory,
  getCategories: () => getCategories,
  getCategoryBySlug: () => getCategoryBySlug,
  getDb: () => getDb,
  getUserByOpenId: () => getUserByOpenId,
  incrementArticleViews: () => incrementArticleViews,
  searchArticles: () => searchArticles,
  updateArticle: () => updateArticle,
  updateCategory: () => updateCategory,
  upsertUser: () => upsertUser
});
module.exports = __toCommonJS(db_exports);
var import_drizzle_orm2 = require("drizzle-orm");
var import_mysql2 = require("drizzle-orm/mysql2");

// drizzle/schema.ts
var import_mysql_core = require("drizzle-orm/mysql-core");
var import_drizzle_orm = require("drizzle-orm");
var users = (0, import_mysql_core.mysqlTable)("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: (0, import_mysql_core.varchar)("openId", { length: 64 }).notNull().unique(),
  name: (0, import_mysql_core.text)("name"),
  email: (0, import_mysql_core.varchar)("email", { length: 320 }),
  loginMethod: (0, import_mysql_core.varchar)("loginMethod", { length: 64 }),
  role: (0, import_mysql_core.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: (0, import_mysql_core.timestamp)("lastSignedIn").defaultNow().notNull()
});
var categories = (0, import_mysql_core.mysqlTable)("categories", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  name: (0, import_mysql_core.varchar)("name", { length: 100 }).notNull().unique(),
  slug: (0, import_mysql_core.varchar)("slug", { length: 100 }).notNull().unique(),
  description: (0, import_mysql_core.text)("description"),
  color: (0, import_mysql_core.varchar)("color", { length: 7 }).default("#000000"),
  icon: (0, import_mysql_core.varchar)("icon", { length: 50 }),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var articles = (0, import_mysql_core.mysqlTable)("articles", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  title: (0, import_mysql_core.varchar)("title", { length: 255 }).notNull(),
  slug: (0, import_mysql_core.varchar)("slug", { length: 255 }).notNull().unique(),
  content: (0, import_mysql_core.longtext)("content").notNull(),
  excerpt: (0, import_mysql_core.text)("excerpt"),
  coverImage: (0, import_mysql_core.varchar)("coverImage", { length: 500 }),
  coverImageKey: (0, import_mysql_core.varchar)("coverImageKey", { length: 500 }),
  author: (0, import_mysql_core.varchar)("author", { length: 100 }).notNull(),
  categoryId: (0, import_mysql_core.int)("categoryId").notNull(),
  views: (0, import_mysql_core.int)("views").default(0),
  published: (0, import_mysql_core.boolean)("published").default(false),
  publishedAt: (0, import_mysql_core.timestamp)("publishedAt"),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var categoriesRelations = (0, import_drizzle_orm.relations)(categories, ({ many }) => ({
  articles: many(articles)
}));
var articlesRelations = (0, import_drizzle_orm.relations)(articles, ({ one }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id]
  })
}));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-for-local-dev-1234567890",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@tisggo.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "123456"
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = (0, import_mysql2.drizzle)(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getArticles(limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(articles).limit(limit).offset(offset).orderBy((t) => (0, import_drizzle_orm2.desc)(t.publishedAt));
  return result;
}
async function getArticleBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(articles).where((0, import_drizzle_orm2.eq)(articles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getArticleById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(articles).where((0, import_drizzle_orm2.eq)(articles.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getArticlesByCategory(categoryId, limit = 10, offset = 0, orderBy = "recent") {
  const db = await getDb();
  if (!db) return [];
  let orderClause;
  if (orderBy === "popular") {
    orderClause = (0, import_drizzle_orm2.desc)(articles.views);
  } else {
    orderClause = (0, import_drizzle_orm2.desc)(articles.publishedAt);
  }
  const result = await db.select().from(articles).where((0, import_drizzle_orm2.eq)(articles.categoryId, categoryId)).limit(limit).offset(offset).orderBy(orderClause);
  return result;
}
async function createArticle(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(articles).values(data);
}
async function updateArticle(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(articles).set(data).where((0, import_drizzle_orm2.eq)(articles.id, id));
}
async function deleteArticle(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(articles).where((0, import_drizzle_orm2.eq)(articles.id, id));
}
async function incrementArticleViews(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ views: import_drizzle_orm2.sql`views + 1` }).where((0, import_drizzle_orm2.eq)(articles.id, id));
}
async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(categories).orderBy((t) => t.name);
  return result;
}
async function getCategoryBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(categories).where((0, import_drizzle_orm2.eq)(categories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCategory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(categories).values(data);
}
async function updateCategory(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set(data).where((0, import_drizzle_orm2.eq)(categories.id, id));
}
async function deleteCategory(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categories).where((0, import_drizzle_orm2.eq)(categories.id, id));
}
async function searchArticles(query, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(articles).where(import_drizzle_orm2.sql`MATCH(${articles.title}, ${articles.content}) AGAINST(${query} IN BOOLEAN MODE)`).limit(limit);
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createArticle,
  createCategory,
  deleteArticle,
  deleteCategory,
  getArticleById,
  getArticleBySlug,
  getArticles,
  getArticlesByCategory,
  getCategories,
  getCategoryBySlug,
  getDb,
  getUserByOpenId,
  incrementArticleViews,
  searchArticles,
  updateArticle,
  updateCategory,
  upsertUser
});
