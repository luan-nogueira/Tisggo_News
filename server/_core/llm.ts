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
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  } = params;

  // Se for chave do Gemini (AIza... ou AQ...), usa o endpoint de compatibilidade da OpenAI do Google
  if (ENV.forgeApiKey.startsWith("AIza") || ENV.forgeApiKey.startsWith("AQ.")) {
    const model = "gemini-1.5-flash";
    // Removendo ?key= da URL para usar apenas headers se necessário
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
    
    console.log(`[Gemini OpenAI] Sending request to: ${url}`);
    
    const response = await fetch(`${url}?key=${ENV.forgeApiKey}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": ENV.forgeApiKey,
        "Authorization": `Bearer ${ENV.forgeApiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 2048,
        response_format: response_format || responseFormat
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini OpenAI ERROR] Status: ${response.status} - Body: ${errorText}`);
      throw new Error(`Gemini OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua resposta.";
  }

  // Fallback para OpenAI/Forge (Legado)
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
      response_format: response_format || responseFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[LLM ERROR] Status: ${response.status} - Body: ${errorText}`);
    throw new Error(`LLM API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
