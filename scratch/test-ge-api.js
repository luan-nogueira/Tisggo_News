
async function testApi() {
  const url = "https://api.globo.com/esporte/futebol/modalidade/futebol_de_campo/liga/brasileirao/edicao/2026/classificacao.json";
  console.log("Fetching Table API...");
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Failed to fetch API:", res.status, res.statusText);
    return;
  }
  const data = await res.json();
  console.log("Success! Found", data.length, "teams.");
  console.log("First team:", data[0].nome_popular, "Points:", data[0].pontos);
}

testApi().catch(console.error);
