import * as db from "../server/db.js";

async function checkArticle() {
  const slug = "maio-laranja-em-campos-mobiliza-rede-de-protecao-com-passeata-e-acoes-educativas";
  console.log(`Buscando artigo: ${slug}`);
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").where("slug", "==", slug).get();
    
    if (snapshot.empty) {
      console.log("Artigo não encontrado.");
      return;
    }

    const data = snapshot.docs[0].data();
    console.log("--- TÍTULO ---");
    console.log(data.title);
    console.log("\n--- CONTEÚDO ---");
    console.log(data.content);
  } catch (error) {
    console.error("Erro:", error);
  }
}

checkArticle().then(() => process.exit(0));
