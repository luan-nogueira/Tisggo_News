import { getCategories } from "../db.js";

async function checkCategories() {
  console.log("--- VERIFICANDO CATEGORIAS NO FIREBASE ---");
  try {
    const cats = await getCategories();
    if (cats.length === 0) {
      console.log("Nenhuma categoria encontrada no banco de dados.");
    } else {
      console.log("Categorias encontradas:");
      cats.forEach(c => {
        console.log(`- Nome: "${c.name}" | Slug: "${c.slug}" | ID: ${c.id}`);
      });
    }
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
  } finally {
    process.exit();
  }
}

checkCategories();
