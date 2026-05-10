import * as db from "../db.js";

const JUNK_MARKERS = [
  "Campos dos Goytacazes terá uma grande mobilização durante o Maio Laranja",
  "A fabricante Ypê apresentou recurso administrativo",
  "O vereador de Campos Maicon Cruz parece um pouco incomodado",
  "A concessionária Águas do Paraíba informou que realizará",
  "Um grupo de advogados que militam na região e patrocinam",
  "STF mantém posts de Garotinho fora do ar",
  "Porto do Açu: fundos de pensão podem comprar",
  "Abastecimento de água pode ser afetado em bairros",
  "Fraudes no transporte escolar no Estado",
  "O ex-goleiro Bruno Fernandes de Souza foi preso",
  "Atuações do Fluminense: John Kennedy",
  "Zubeldía comenta gritos de burro"
];

async function globalCleanup() {
  console.log("🧹 INICIANDO FAXINA GLOBAL DE CONTEÚDO...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      let modified = false;

      // Se o conteúdo tiver mais de 10 parágrafos, é suspeito de vazamento
      const paragraphs = content.split('</p>');
      
      for (const marker of JUNK_MARKERS) {
        // Se o marcador NÃO for o próprio título da notícia (para não apagar a notícia certa)
        if (content.includes(marker) && !data.title.toLowerCase().includes(marker.toLowerCase().substring(0, 20))) {
          const parts = content.split(marker);
          content = parts[0];
          modified = true;
          console.log(`✂️ Cortando lixo em: "${data.title}" -> Marcador: ${marker.substring(0, 30)}...`);
        }
      }

      if (modified) {
        // Garantir que fechamos a última tag p se cortamos
        if (content.trim() && !content.trim().endsWith('</p>')) {
          content = content.trim() + '</p>';
        }
        await doc.ref.update({ content: content.trim() });
        count++;
      }
    }

    console.log(`\n✅ Faxina concluída! ${count} notícias foram saneadas.`);
  } catch (error) {
    console.error("❌ Erro na faxina:", error);
  }
}

globalCleanup();
