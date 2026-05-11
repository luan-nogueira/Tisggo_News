import { getDb } from './server/db.js';

async function cleanup() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
      count++;
    }
    console.log('Limpeza TOTAL finalizada! Removidos:', count);
  } catch (error) {
    console.error('Erro na limpeza:', error);
  }
}

cleanup();
