import { automateNews } from './server/automation.js';

async function test() {
  console.log('Iniciando teste de automação...');
  try {
    const results = await automateNews();
    console.log('Resultados da automação:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Erro no teste de automação:', error);
  }
}

test();
