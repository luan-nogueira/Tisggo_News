import * as db from "../db.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

// Configuration for sources to help re-scraping
const SOURCE_CONFIGS = [
  { name: "GE Globo", titleSelector: "h1.content-head__title", contentSelector: ".content-text", baseUrl: "https://ge.globo.com" },
  { name: "g1 Norte Fluminense", titleSelector: "h1.content-head__title", contentSelector: ".content-text", baseUrl: "https://g1.globo.com" },
  { name: "Ururau", titleSelector: "h1.post-title", contentSelector: ".entry-content", baseUrl: "https://ururau.com.br" },
  { name: "Campos Ocorrências", titleSelector: ".entry-title", contentSelector: ".entry-content", baseUrl: "https://www.camposocorrencias.com.br" }
];

async function fixImages() {
  console.log("🚀 INICIANDO CORREÇÃO DE IMAGENS REPETIDAS...");
  try {
    const firestore = await db.getDb();
    const snapshot = await firestore.collection("articles").get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentImage = data.coverImage || "";
      const sourceUrl = data.sourceUrl || ""; // We need to make sure we store sourceUrl

      // If image is a fallback (Unsplash) or missing
      if (currentImage.includes("unsplash.com") || !currentImage) {
        if (!sourceUrl) {
          console.log(`⚠️ Pulando "${data.title}": Sem URL de origem para re-scrapear.`);
          continue;
        }

        console.log(`🔍 Tentando recuperar imagem original para: "${data.title}"...`);
        
        try {
          const res = await fetch(sourceUrl, {
            agent,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
          });
          if (!res.ok) continue;

          const html = await res.text();
          const $ = cheerio.load(html);
          
          // Match the URL to a config
          const config = SOURCE_CONFIGS.find(c => sourceUrl.includes(c.baseUrl.replace("https://", "")));
          if (!config) continue;

          let newCoverImage = "";
          const ogImage = $('meta[property="og:image"]').attr('content');
          
          if (ogImage && !isSuspicious(ogImage)) {
            newCoverImage = ogImage;
          }

          if (!newCoverImage) {
            $(config.contentSelector).find('img').each((i, img) => {
              const src = $(img).attr('data-src') || $(img).attr('src') || $(img).attr('data-original');
              if (src && !isSuspicious(src)) {
                newCoverImage = src.startsWith('http') ? src : (src.startsWith('/') ? config.baseUrl + src : config.baseUrl + '/' + src);
                return false;
              }
            });
          }

          if (newCoverImage && newCoverImage !== currentImage && !isSuspicious(newCoverImage)) {
            await doc.ref.update({ coverImage: newCoverImage });
            console.log(`✅ Imagem atualizada com sucesso!`);
            count++;
          } else {
            console.log(`❌ Nenhuma imagem original válida encontrada.`);
          }
        } catch (e) {
          console.error(`❌ Erro ao processar ${sourceUrl}:`, e.message);
        }
      }
    }

    console.log(`\n🎉 Fim da correção! ${count} imagens foram substituídas pelas originais.`);
  } catch (error) {
    console.error("❌ Erro geral:", error);
  }
}

function isSuspicious(url: string) {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  return /logo|banner|header|brand|placeholder|default|background|campanha|graphic|arte/i.test(lowerUrl) || 
         lowerUrl.includes('ururau-noticias') || 
         lowerUrl.includes('campos-ocorrencias') ||
         (lowerUrl.includes('ururau') && !lowerUrl.includes('fotos/') && !lowerUrl.includes('img/noticias/'));
}

fixImages();
