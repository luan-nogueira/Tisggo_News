// Vercel Entry Point - Extreme Lazy Loading
export default async (req: any, res: any) => {
  try {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-trpc-source');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Dynamic import with absolute-like path for Vercel
    const { default: app } = await import("./../server/index.ts");
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err.message);
    res.status(500).json({ 
      error: "Critical Boot Error", 
      message: err.message,
      detail: "O servidor falhou ao inicializar os módulos principais. Verifique o formato da sua chave do Firebase."
    });
  }
};
