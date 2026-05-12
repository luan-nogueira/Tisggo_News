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
    // Usando gemini-1.5-flash pela altíssima obediência a esquemas JSON e quotas otimizadas
    const model = "gemini-1.5-flash-latest"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.forgeApiKey}`;
    
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

    console.log(`[Gemini Native] Sending request to: ${url.replace(ENV.forgeApiKey, "***")}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini Native ERROR] Status: ${response.status} - Body: ${errorText}`);
      throw new Error(`Gemini Native API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar.";
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
