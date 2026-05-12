import { ENV } from "./env.ts";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type LLMParams = {
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  responseFormat?: { type: "json_object" };
  response_format?: { type: "json_object" };
  outputSchema?: any;
  output_schema?: any;
};

export const invokeLLM = async (params: LLMParams): Promise<string> => {
  const {
    messages,
    temperature,
    max_tokens,
  } = params;

  // Se for chave do Gemini (AIza... ou AQ...), usa a API Nativa com o modelo confirmado pelo Discovery
  if (ENV.forgeApiKey.startsWith("AIza") || ENV.forgeApiKey.startsWith("AQ.")) {
    // Array de alta disponibilidade: alterna quotas gratuitas distintas automaticamente em caso de exaustão
    const modelsToTry = ["gemini-flash-lite-latest", "gemini-1.5-flash", "gemini-2.0-flash"];
    
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    const body: any = { contents };
    
    const isJsonRequested = params.responseFormat?.type === "json_object" || params.response_format?.type === "json_object";
    body.generationConfig = {
      temperature: temperature ?? 0.7,
      ...(isJsonRequested ? { responseMimeType: "application/json" } : {})
    };
    
    // Adiciona personalidade (system_instruction)
    const systemMessage = messages.find(m => m.role === "system");
    if (systemMessage) {
      body.system_instruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    let lastErrorText = "";
    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.forgeApiKey}`;
      console.log(`[Gemini Native] Attempting generation with quota tier: ${model}`);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          lastErrorText = await response.text();
          console.warn(`[Gemini Native Warning] Tier ${model} returned status ${response.status}. Switching to backup quota bucket...`);
          continue;
        }

        const data = await response.json();
        const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) {
          return outputText;
        }
      } catch (e: any) {
        console.warn(`[Gemini Native Failover] Network error on ${model}: ${e.message}. Retrying next bucket...`);
      }
    }

    console.error(`[Gemini Native EXHAUSTED] All native free-tier buckets consumed. Last API reply: ${lastErrorText}`);
    // Se todos os buckets nativos estiverem esgotados, segue automaticamente para a proxy reserva da Manus/Forge
  }

  // Fallback (Forge/OpenAI)
  const url = "https://forge.manus.im/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
};
