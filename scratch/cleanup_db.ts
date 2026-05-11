import * as db from "../server/db.js";

const FORBIDDEN_WORDS = [
  /Aviso\s+importante:?\s+a\s+total\s+ou\s+parcial\s+de\s+qualquer\s+conteúdo.*?esfera\s+judicial\.?/gi,
  /Aviso\s+importante:?\s+a\s+total\s+ou\s+parcial[^.]*/gi,
  /reproduzir\s+nosso\s+conteúdo,?\s+entre\s+em\s+contato[^.]*/gi,
  /comercial@[^.]*/gi, /Todos os direitos reservados/gi,
  /Copyright[^<]*/gi, /©[^<]*/gi,
  /Se você possui um blog ou site e deseja estabelecer uma parceria[^<]*/gi,
  /Ururau/gi, /Portal Ururau/gi, /ururau\.com\.br/gi,
  /Campos Ocorrências/gi, /camposocorrencias\.com\.br/gi,
  /g1/gi, /ge\.globo/gi, /Globo/gi
];

async function cleanupExisting() {
  console.log("Iniciando limpeza profunda de artigos existentes...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    console.log(`Encontrados ${snapshot.size} artigos. Analisando...`);
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      let title = data.title || "";
      let excerpt = data.excerpt || "";
      let changed = false;

      for (const regex of FORBIDDEN_WORDS) {
        if (regex.test(content)) {
          content = content.replace(regex, "");
          changed = true;
        }
        if (regex.test(title)) {
          title = title.replace(regex, "");
          changed = true;
        }
        if (regex.test(excerpt)) {
          excerpt = excerpt.replace(regex, "");
          changed = true;
        }
      }

      if (changed) {
        await doc.ref.update({ 
          content, 
          title, 
          excerpt: excerpt.substring(0, 250) 
        });
        count++;
        console.log(`[LIMPO] ${title.substring(0, 50)}...`);
      }
    }

    console.log(`Limpeza concluída! ${count} artigos foram corrigidos.`);
  } catch (error) {
    console.error("Erro na limpeza:", error);
  }
}

cleanupExisting().then(() => process.exit(0));
