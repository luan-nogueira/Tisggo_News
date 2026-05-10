import { getDb } from './server/db.js';

async function cleanup() {
  try {
    const db = await getDb();
    const snapshot = await db.collection('articles').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content || "";
      
      // Split by paragraph tags or newlines
      const paragraphs = content.split(/<\/p>|<br\/?>|\n/i)
        .map(p => p.replace(/<p>/gi, '').trim())
        .filter(p => p.length > 40);
      
      const uniqueParagraphs = [];
      const seen = new Set();

      for (const p of paragraphs) {
        if (!seen.has(p)) {
          seen.add(p);
          uniqueParagraphs.push(`<p>${p}</p>`);
        }
      }

      const newContent = uniqueParagraphs.join('\n');

      if (newContent !== content) {
        await doc.ref.update({ content: newContent });
        console.log('Organizada notícia:', data.title);
        count++;
      }
    }
    console.log('Organização concluída! Total de notícias corrigidas:', count);
  } catch (error) {
    console.error('Erro na organização:', error);
  }
}

cleanup();
