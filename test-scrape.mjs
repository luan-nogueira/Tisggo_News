import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://www.ururau.com.br/');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const links = [];
  $('a[href*="/noticias/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.match(/\/\d+\/$/)) {
      links.push(href);
    }
  });
  
  const uniqueLinks = [...new Set(links)].slice(0, 3);
  console.log("Found links:", uniqueLinks);
  
  for (const link of uniqueLinks) {
    const artRes = await fetch(link);
    const artHtml = await artRes.text();
    const $art = cheerio.load(artHtml);
    
    const title = $art('h1').first().text().trim();
    // try to get content
    const contentText = $art('article, .content-article, .post-content, .texto-materia').text().trim() || $art('p').map((i, el) => $art(el).text()).get().join('\n');
    console.log("Title:", title);
    console.log("Content start:", contentText.substring(0, 100));
  }
}

test().catch(console.error);
