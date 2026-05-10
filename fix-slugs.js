import { getDb } from './server/db.js';

async function fixSlugs() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.slug) {
        const slug = data.title.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
        
        await doc.ref.update({ slug });
        console.log('Link criado para:', data.title);
        count++;
      }
    }
    console.log('Sucesso! Total de links restaurados:', count);
  } catch (error) {
    console.error('Erro ao restaurar links:', error);
  }
}

fixSlugs();
