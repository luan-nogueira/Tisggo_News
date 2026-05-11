import { getDb } from './server/db.js';

async function verify() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').limit(5).get();
    
    console.log('--- Verificação de Qualidade Premium ---');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Título: ${data.title}`);
      console.log(`Tamanho do Texto: ${data.content.length} caracteres`);
      console.log(`Imagem: ${data.coverImage}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
  }
}

verify();
