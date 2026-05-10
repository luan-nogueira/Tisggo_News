import * as db from "../db.js";

async function ultimateCleanup() {
  console.log("🚀 INICIANDO LIMPEZA DEFINITIVA DE TEXTO E GRAMÁTICA...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      let title = data.title || "";
      let hasChanges = false;

      // 1. Corrigir "O  teve" (com múltiplos espaços)
      if (content.match(/O\s{1,5}teve\s+acesso/gi)) {
        content = content.replace(/O\s{1,5}teve\s+acesso/gi, "O Tisggo News teve acesso");
        hasChanges = true;
      }

      // 2. Corrigir "O teve" genérico no início de parágrafos
      if (content.match(/<p>O\s+teve/gi)) {
        content = content.replace(/<p>O\s+teve/gi, "<p>O Tisggo News teve");
        hasChanges = true;
      }

      // 3. Normalizar espaços duplos residuais
      if (content.includes("  ")) {
        content = content.replace(/\s{2,}/g, " ");
        hasChanges = true;
      }

      // 4. Remover "Redação do ge" residual que possa ter escapado
      if (content.includes("Redação do ge")) {
        content = content.replace(/Por\s+(?:Redação do\s+)?ge\s+.*?—\s+.*?(\n|$|<)/gi, "");
        hasChanges = true;
      }

      if (hasChanges) {
        await doc.ref.update({ 
          content: content.trim(),
          title: title.trim()
        });
        count++;
        console.log(`✅ Corrigido: ${title.substring(0, 30)}...`);
      }
    }

    console.log(`\n🎉 Fim da faxina! ${count} notícias foram salvas de erros gramaticais.`);
  } catch (error) {
    console.error("❌ Erro na faxina:", error);
  }
}

ultimateCleanup();
