import app from "../server/index";

// Vercel Entry Point
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

    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err.message);
    res.status(500).json({ 
      error: "Critical Error", 
      message: err.message 
    });
  }
};
