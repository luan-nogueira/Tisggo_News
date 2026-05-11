import { getDb } from './server/db.js';

async function count() {
  try {
    const db = await getDb();
    const categoriesSnapshot = await db.collection('categories').get();
    
    console.log('--- Estatísticas do Portal Tisgo ---');
    for (const catDoc of categoriesSnapshot.docs) {
      const cat = catDoc.data();
      const articlesSnapshot = await db.collection('articles').where('categoryId', '==', catDoc.id).get();
      console.log(`Categoria: ${cat.name} | Notícias: ${articlesSnapshot.size}`);
    }
    console.log('---------------------------------------');
  } catch (error) {
    console.error('Erro na contagem:', error);
  }
}

count();
