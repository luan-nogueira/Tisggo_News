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
  isInteractive?: boolean;
};

const invokeOpenAI = async (params: LLMParams): Promise<string> => {
  if (!ENV.openaiApiKey) throw new Error("OpenAI API Key not configured");

  const isJsonRequested = params.responseFormat?.type === "json_object" || params.response_format?.type === "json_object";
  
  const body = {
    model: "gpt-4o-mini", 
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens,
    ...(isJsonRequested ? { response_format: { type: "json_object" } } : {})
  };

  console.log("[OpenAI Fallback] Attempting generation with GPT-4o-mini...");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.openaiApiKey}`
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
    
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
    let hadRateLimitError = false;
    // Loop para tentar os modelos e fazer backoff se batermos no limite de quota (429)
    for (let retry = 0; retry < 2; retry++) {
      for (const model of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.forgeApiKey}`;
        console.log(`[Gemini Native] Attempting generation with quota tier: ${model} (Retry: ${retry})`);
        
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            lastErrorText = await response.text();
            console.warn(`[Gemini Native Warning] Tier ${model} returned status ${response.status}. Switching to backup quota bucket...`);
            
            if (response.status === 429) {
              hadRateLimitError = true;
              const sleepTime = params.isInteractive ? 2000 : 20000;
              console.log(`[Gemini Native] Rate limit hit. Sleeping for ${sleepTime/1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, sleepTime));
            }
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
    }

    if (hadRateLimitError) {
      console.error("[Gemini Native EXHAUSTED] Rate limits exceeded on all working models.");
      
      // Fallback para OpenAI se houver chave configurada
      if (ENV.openaiApiKey) {
        try {
          return await invokeOpenAI(params);
        } catch (openaiError: any) {
          console.error(`[OpenAI Fallback Fail] ${openaiError.message}`);
        }
      }

      throw new Error(JSON.stringify({
        error: {
          message: "A Inteligência Artificial do site está sobrecarregada ou atingiu o limite gratuito diário do Google. Por favor, tente novamente em alguns minutos."
        }
      }));
    }

    // Se falhou por outros motivos (404, etc), tenta OpenAI antes de desistir
    if (ENV.openaiApiKey) {
      try {
        return await invokeOpenAI(params);
      } catch (openaiError: any) {
        console.error(`[OpenAI Fallback Fail] ${openaiError.message}`);
      }
    }

    console.error(`[Gemini Native EXHAUSTED] All native free-tier buckets consumed. Last API reply: ${lastErrorText}`);
    throw new Error(`Gemini API Error: ${lastErrorText}`);
  }

  // Se não for Gemini, tenta usar forgeApiKey como se fosse OpenAI (comportamento legado compatível)
  if (ENV.forgeApiKey && !ENV.forgeApiKey.startsWith("AIza") && !ENV.forgeApiKey.startsWith("AQ.")) {
    return await invokeOpenAI({ ...params, messages });
  }

  // Se nada acima funcionou mas temos a chave dedicada do OpenAI
  if (ENV.openaiApiKey) {
    return await invokeOpenAI(params);
  }

  throw new Error("Chave de API inválida configurada.");
};
