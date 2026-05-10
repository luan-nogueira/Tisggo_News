import * as db from "../db.js";

async function checkArticle() {
  const slug = "mensagens-atribuidas-a-bacellar-citam-repasses-obra-parada-e-pressao-contra-campos";
  const article = await db.getArticleBySlug(slug);
  if (article) {
    console.log(`TITULO: ${article.title}`);
    console.log(`CONTEUDO: ${article.content}`);
  } else {
    console.log("Notícia não encontrada.");
  }
}

checkArticle();
