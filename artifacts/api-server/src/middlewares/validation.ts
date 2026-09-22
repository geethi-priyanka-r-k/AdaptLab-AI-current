import type { NextFunction, Request, Response } from "express";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(param: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[param] as string;
    if (!value || !UUID_PATTERN.test(value)) {
      res.status(400).json({ error: `Invalid ${param} format` });
      return;
    }
    next();
  };
}

export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Request body is required" });
      return;
    }
    
    const missing = requiredFields.filter(field => !(field in body) || body[field] === null || body[field] === undefined);
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }
    
    next();
  };
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body strings to prevent basic injection attacks
  if (req.body && typeof req.body === "object") {
    const sanitizeString = (value: unknown): unknown => {
      if (typeof value === "string") {
        // Remove potential script tags and other dangerous patterns
        return value
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .trim();
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeString);
      }
      if (typeof value === "object" && value !== null) {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeString(val);
        }
        return sanitized;
      }
      return value;
    };
    
    req.body = sanitizeString(req.body) as Record<string, unknown>;
  }
  
  next();
}

export function limitRequestBodySize(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.header("content-length") || "0", 10);
    if (contentLength > maxSize) {
      res.status(413).json({ error: "Request body too large" });
      return;
    }
    next();
  };
}
