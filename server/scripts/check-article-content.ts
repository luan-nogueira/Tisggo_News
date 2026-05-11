import * as db from "../db.js";

async function check() {
  const slug = "stf-mantem-posts-de-garotinho-fora-do-ar-mas-nao-barra-debate-sobre-alcalis";
  const firestore = await db.getDb();
  const snapshot = await firestore.collection("articles").where("slug", "==", slug).get();
  
  if (snapshot.empty) {
    // Try without the random suffix
    const all = await firestore.collection("articles").get();
    const found = all.docs.find(d => d.data().slug.startsWith(slug));
    if (found) {
      console.log("CONTEUDO:");
      console.log(found.data().content);
      return;
    }
    console.log("Notícia não encontrada.");
    return;
  }
  
  console.log("CONTEUDO:");
  console.log(snapshot.docs[0].data().content);
}

check();
