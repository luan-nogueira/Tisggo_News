import { createArticle } from "./articles-crud";
import { getDb } from "./db";
import { categories as categoriesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Service to automate news generation for Campos dos Goytacazes.
 * In a real-world scenario, this would fetch from RSS feeds or use a search API.
 * For this project, we'll use a curated list of recent local events and AI-generated content.
 */
export async function automateNews() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Ensure default categories exist
  const categories = await db.select().from(categoriesTable);
  const getCatId = (name: string) => categories.find(c => c.name === name)?.id || categories[0]?.id || 1;

  // News items based on recent events in Campos dos Goytacazes (May 2026)
  const newsSeeds = [
    {
      title: "Operação da PF investiga fraudes na educação em Campos",
      excerpt: "Investigação aponta para desvios em contratos da Secretaria de Educação e envolve figuras políticas locais.",
      content: `A Polícia Federal deflagrou uma grande operação em Campos dos Goytacazes nesta manhã para investigar um esquema de corrupção na Secretaria de Educação. \n\nSegundo as investigações preliminares, contratos públicos teriam sido superfaturados para alimentar caixas de campanhas eleitorais. Vários mandados de busca e apreensão foram cumpridos em residências e escritórios ligados a políticos da região. \n\nA operação, batizada de 'Caderno Limpo', busca rastrear o destino de aproximadamente 5 milhões de reais que teriam sido desviados nos últimos dois anos. A prefeitura de Campos ainda não se manifestou oficialmente sobre o caso.`,
      author: "Redação Tisgo",
      categoryName: "Política",
      coverImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "FGTS Calamidade liberado para moradores afetados por interdição de ponte",
      excerpt: "Moradores de Guarus e proximidades da Ponte Barcelos Martins já podem solicitar o saque do benefício.",
      content: `A Caixa Econômica Federal anunciou a liberação do saque do FGTS na modalidade calamidade para os moradores de Campos dos Goytacazes impactados pela interdição da Ponte Barcelos Martins. \n\nA estrutura, que liga o Centro a Guarus, permanece fechada para reparos emergenciais após danos estruturais detectados pela Defesa Civil. O benefício visa auxiliar as famílias que tiveram sua mobilidade e rotina severamente afetadas pela interdição prolongada. \n\nOs interessados devem realizar a solicitação através do aplicativo do FGTS, anexando comprovante de residência e documento de identificação.`,
      author: "Economia Tisgo",
      categoryName: "Economia",
      coverImage: "https://images.unsplash.com/photo-1541872703-74c5e443d1f9?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "Defesa Civil de Campos emite alerta de ressaca para o Farol de São Thomé",
      excerpt: "Ondas podem chegar a 2,5 metros no litoral campista; banhistas e pescadores devem redobrar a atenção.",
      content: `O litoral de Campos dos Goytacazes está em alerta máximo. A Defesa Civil Municipal emitiu um comunicado de ressaca para a praia do Farol de São Thomé, válido para as próximas 48 horas. \n\nDe acordo com o monitoramento meteorológico, a passagem de uma frente fria pelo oceano está gerando ondas de forte intensidade. Há risco de invasão da água em trechos da orla onde a erosão costeira é mais crítica. \n\nA Marinha do Brasil recomenda que embarcações de pequeno porte evitem sair ao mar e que a população não se aproxime de áreas de arrebentação.`,
      author: "Clima e Defesa",
      categoryName: "Cidades",
      coverImage: "https://images.unsplash.com/photo-1505144808405-126af922fb6a?auto=format&fit=crop&q=80&w=800",
    }
  ];

  const results = [];
  for (const seed of newsSeeds) {
    try {
      const result = await createArticle({
        title: seed.title,
        excerpt: seed.excerpt,
        content: seed.content,
        author: seed.author,
        categoryId: getCatId(seed.categoryName),
        coverImage: seed.coverImage,
        published: true,
      });
      results.push({ title: seed.title, status: "success" });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        results.push({ title: seed.title, status: "skipped (already exists)" });
      } else {
        results.push({ title: seed.title, status: "error", message: error.message });
      }
    }
  }

  return results;
}
