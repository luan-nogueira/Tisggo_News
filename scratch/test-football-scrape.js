
import * as cheerio from "cheerio";
import fs from 'fs';

async function testScrape() {
  const url = "https://ge.globo.com/futebol/brasileirao-serie-a/";
  console.log("Fetching GE...");
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  fs.writeFileSync('scratch/ge-dump.html', html);
  const $ = cheerio.load(html);

  console.log("Parsing Table...");
  const teams = [];
  $('.tabela__equipe').each((i, el) => {
    const name = $(el).find('.tabela__equipe-nome').text().trim();
    const pos = $(el).find('.tabela__equipe-posicao').text().trim();
    teams.push({ name, pos });
  });

  console.log("Found teams:", teams.length);
  console.log("Top 3:", teams.slice(0, 3));

  console.log("Parsing Games...");
  const games = [];
  $('.jogo__transmissao--link').each((i, el) => {
    const mandante = $(el).find('.jogo__equipe--mandante .jogo__equipe-nome').text().trim();
    const visitante = $(el).find('.jogo__equipe--visitante .jogo__equipe-nome').text().trim();
    const placarM = $(el).find('.jogo__placar-placar--campeonato-mandante').text().trim();
    const placarV = $(el).find('.jogo__placar-placar--campeonato-visitante').text().trim();
    const status = $(el).find('.jogo__transmissao--status').text().trim();
    games.push({ mandante, visitante, placarM, placarV, status });
  });

  console.log("Found games:", games.length);
  console.log("Sample game:", games[0]);
}

testScrape().catch(console.error);
