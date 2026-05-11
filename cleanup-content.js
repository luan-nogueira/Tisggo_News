import { getDb } from './server/db.js';

async function cleanup() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').get();
    let count = 0;

    const forbidden = [
      /Siga o canal.*?no WhatsApp/gi,
      /📱.*?WhatsApp/gi,
      /Veja também:.*?$/gm,
      /LEIA TAMBÉM:.*?$/gm,
      /Aviso importante: a total ou parcial.*?comercial@.*?\.br/gi
    ];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      let modified = false;

      for (const regex of forbidden) {
        if (regex.test(content)) {
          content = content.replace(regex, "");
          modified = true;
        }
      }

      if (modified) {
        await doc.ref.update({ content: content.trim() });
        console.log('Limpo conteúdo de:', data.title);
        count++;
      }
    }
    console.log('Limpeza finalizada! Total ajustado:', count);
  } catch (error) {
    console.error('Erro na limpeza:', error);
  }
}

cleanup();
