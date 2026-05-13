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

  // ── 1. Extração do Pool Dinâmico de Chaves de Alta Disponibilidade ──
  const keysPool: string[] = [];
  const addKey = (k?: string) => {
    if (!k) return;
    k.split(/[,;|]+/).forEach(part => {
      const clean = part.trim();
      if (clean && !keysPool.includes(clean)) keysPool.push(clean);
    });
  };

  addKey(ENV.forgeApiKey);
  if (typeof process !== "undefined" && process.env) {
    Object.keys(process.env).forEach(keyName => {
      if ((keyName.startsWith("GEMINI_API_KEY") || keyName.startsWith("FORGE_API_KEY")) && process.env[keyName]) {
        addKey(process.env[keyName]);
      }
    });
  }

  // Filtra as chaves nativas do Gemini
  const geminiKeys = keysPool.filter(k => k.startsWith("AIza") || k.startsWith("AQ."));

  if (geminiKeys.length > 0) {
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
    
    const systemMessage = messages.find(m => m.role === "system");
    if (systemMessage) {
      body.system_instruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    let lastErrorText = "";
    let hadRateLimitError = false;

    // Rotação: tenta em todas as chaves disponíveis no pool para somar e multiplicar os limites gratuitos
    for (const currentKey of geminiKeys) {
      const keyShort = currentKey.substring(0, 12) + "...";
      for (const model of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        console.log(`[Gemini Native Pool] Attempting model ${model} with key ${keyShort}`);
        
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            lastErrorText = await response.text();
            console.warn(`[Gemini Native Warning] Model ${model} on key ${keyShort} returned status ${response.status}.`);
            
            if (response.status === 429) {
              hadRateLimitError = true;
              console.log(`[Gemini Native Pool] Quota/Rate limit hit for key ${keyShort}. Rotating automatically to the next backup API key...`);
              // Passamos imediatamente para a próxima chave sem travar a execução
            }
            continue;
          }

          const data = await response.json();
          const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (outputText) {
            return outputText;
          }
        } catch (e: any) {
          console.warn(`[Gemini Native Network Error] ${model} on key ${keyShort}: ${e.message}. Testing next option...`);
        }
      }
    }

    // Se todas as chaves do Gemini deram cota excedida, aplicamos um backoff suave e tentamos OpenAI se houver
    if (hadRateLimitError) {
      console.error(`[Gemini Native EXHAUSTED] Rate limits exceeded on ALL ${geminiKeys.length} configured API keys.`);
      
      if (ENV.openaiApiKey) {
        try {
          return await invokeOpenAI(params);
        } catch (openaiError: any) {
          console.error(`[OpenAI Fallback Fail] ${openaiError.message}`);
        }
      }

      const sleepTime = params.isInteractive ? 2000 : 10000;
      console.log(`[Gemini Native Pool] Sleeping for ${sleepTime/1000}s before giving up...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));

      throw new Error(JSON.stringify({
        error: {
          message: "A Inteligência Artificial do site atingiu o limite gratuito diário. Dica: Adicione mais chaves gratuitas separadas por vírgula no painel para multiplicar seu limite!"
        }
      }));
    }

    if (ENV.openaiApiKey) {
      try {
        return await invokeOpenAI(params);
      } catch (openaiError: any) {
        console.error(`[OpenAI Fallback Fail] ${openaiError.message}`);
      }
    }

    console.error(`[Gemini Native EXHAUSTED] All native options failed. Last API reply: ${lastErrorText}`);
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
