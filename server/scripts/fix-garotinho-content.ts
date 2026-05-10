import * as db from "../db.js";

async function fixGarotinho() {
  const slug = "stf-mantem-posts-de-garotinho-fora-do-ar-mas-nao-barra-debate-sobre-alcalis";
  const firestore = await db.getDb();
  const snapshot = await firestore.collection("articles").where("slug", "==", slug).get();
  
  if (snapshot.empty) {
    const all = await firestore.collection("articles").get();
    const found = all.docs.find(d => d.data().slug.startsWith(slug));
    if (found) {
      await performFix(found);
    }
    return;
  }
  
  await performFix(snapshot.docs[0]);
}

async function performFix(doc) {
  const data = doc.data();
  let content = data.content;
  
  // Cortar o conteúdo onde começam as notícias intrusas
  const stopMark = "Campos dos Goytacazes terá uma grande mobilização durante o Maio Laranja";
  if (content.includes(stopMark)) {
    content = content.split(stopMark)[0];
    await doc.ref.update({ content: content.trim() });
    console.log("✅ Notícia do Garotinho limpa com sucesso!");
  } else {
    console.log("⚠️ Marca de interrupção não encontrada.");
  }
}

fixGarotinho();
