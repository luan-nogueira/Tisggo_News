import { getDb } from './server/db.js';

async function cleanup() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').get();
    const seen = new Set();
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      const slug = doc.data().slug;
      if (seen.has(slug)) {
        await doc.ref.delete();
        console.log('Apagada duplicata:', slug);
        deletedCount++;
      } else {
        seen.add(slug);
      }
    }
    console.log('Faxina concluída! Total de duplicatas removidas:', deletedCount);
  } catch (error) {
    console.error('Erro na faxina:', error);
  }
}

cleanup();
