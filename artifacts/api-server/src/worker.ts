import app from "./app";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set environment variables from Cloudflare Worker env
    process.env.SUPABASE_URL = env.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
    process.env.GROQ_MODEL = env.GROQ_MODEL || "llama-3.3-70b-versatile";
    process.env.NODE_ENV = env.ENVIRONMENT || "production";

    // Convert Cloudflare Request to Express-compatible format
    const url = new URL(request.url);
    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: any = null;
    if (request.body) {
      body = await request.text();
    }

    // Simulate Express request/response
    const expressReq: any = {
      method,
      url: url.pathname + url.search,
      headers,
      body: body ? JSON.parse(body) : null,
      header(name: string) {
        return headers[name.toLowerCase()];
      },
    };

    const expressRes: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      
      json(data: any) {
        this.body = JSON.stringify(data);
        this.headers["content-type"] = "application/json";
        return this;
      },
      
      send(data: string) {
        this.body = data;
        return this;
      },
      
      setHeader(name: string, value: string) {
        this.headers[name] = value;
        return this;
      },
    };

    // Process through Express app
    await new Promise<void>((resolve, reject) => {
      app(expressReq, expressRes, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Convert Express response to Cloudflare Response
    return new Response(expressRes.body, {
      status: expressRes.statusCode,
      headers: expressRes.headers,
    });
  },
};

interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  ENVIRONMENT?: string;
}
