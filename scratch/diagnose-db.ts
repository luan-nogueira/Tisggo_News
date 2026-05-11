import { getDb } from "../server/db";
import { articles, categories } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function diagnose() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Não foi possível conectar ao banco!");
    return;
  }
  
  const cats = await db.select().from(categories);
  console.log(`📂 Total de categorias: ${cats.length}`);
  cats.forEach(c => console.log(`  - ${c.name} (${c.slug})`));

  const count = await db.select({ value: sql`count(*)` }).from(articles);
  console.log(`📊 Total de notícias: ${count[0].value}`);
  
  const latest = await db.select().from(articles).limit(5);
  latest.forEach(a => console.log(`- [${a.published ? 'PUB' : 'DRAFT'}] ${a.title} (CatID: ${a.categoryId})`));
}

diagnose();
