import * as db from "../server/db.js";

async function fixArticle() {
  const slug = "maio-laranja-em-campos-mobiliza-rede-de-protecao-com-passeata-e-acoes-educativas";
  console.log(`Corrigindo artigo: ${slug}`);
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").where("slug", "==", slug).get();
    
    if (snapshot.empty) return;

    const doc = snapshot.docs[0];
    const data = doc.data();
    let content = data.content;

    // Encontrar o ponto onde a programação termina e as notícias intrusas começam
    // A última linha legítima parece ser "Panfletagem educativa na BR-101, em Ururaí"
    const cutPoint = content.indexOf("Panfletagem educativa na BR-101, em Ururaí");
    if (cutPoint !== -1) {
      const endOfLine = content.indexOf("</p>", cutPoint) + 4;
      content = content.substring(0, endOfLine);
      
      await doc.ref.update({ content });
      console.log("Artigo corrigido com sucesso!");
    } else {
      console.log("Ponto de corte não encontrado.");
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

fixArticle().then(() => process.exit(0));
