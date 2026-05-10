import fetch from "node-fetch";
import * as cheerio from "cheerio";
import https from "https";

async function debug() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const url = "https://www.ururau.com.br/noticias/politica/stf-mantem-posts-de-garotinho-fora-do-ar-mas-nao-barra-debate-sobre-alcalis/81383/";
  
  const res = await fetch(url, { agent });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("DEBUG URURAU (Garotinho):");
  console.log("TITLE:", $('h1.post-title').text().trim());
  console.log("OG:IMAGE:", $('meta[property="og:image"]').attr('content'));
  console.log("ANY IMG TAGS IN CONTENT:");
  $('.entry-content img').each((i, el) => {
    console.log(`- SRC: ${$(el).attr('src')} | DATA-SRC: ${$(el).attr('data-src')}`);
  });
  
  // Try finding the main article image outside .entry-content if needed
  console.log("ANY IMG TAGS IN BODY:");
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.includes('/uploads/')) {
       console.log(`- FOUND UPLOAD: ${src}`);
    }
  });
}

debug();
