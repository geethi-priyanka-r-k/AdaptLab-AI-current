import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  }, "Request error");

  // Handle operational errors (expected errors)
  if (error instanceof AppError && error.isOperational) {
    res.status(error.statusCode).json({
      error: error.message,
      ...(error.context && { context: error.context }),
    });
    return;
  }

  // Handle database errors
  if (error.message.includes("Supabase") || error.message.includes("database")) {
    res.status(502).json({
      error: "Database service unavailable. Please try again later.",
    });
    return;
  }

  // Handle network/external service errors
  if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
    res.status(503).json({
      error: "External service unavailable. Please try again later.",
    });
    return;
  }

  // Handle timeout errors
  if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
    res.status(504).json({
      error: "Request timeout. Please try again later.",
    });
    return;
  }

  // Handle validation errors
  if (error.message.includes("Invalid") || error.message.includes("validation")) {
    res.status(400).json({
      error: error.message,
    });
    return;
  }

  // Handle authentication errors
  if (error.message.includes("Authentication") || error.message.includes("401")) {
    res.status(401).json({
      error: "Authentication required.",
    });
    return;
  }

  // Handle authorization errors
  if (error.message.includes("authorization") || error.message.includes("403")) {
    res.status(403).json({
      error: "Access denied.",
    });
    return;
  }

  // Handle not found errors
  if (error.message.includes("not found") || error.message.includes("404")) {
    res.status(404).json({
      error: "Resource not found.",
    });
    return;
  }

  // Default to 500 for unexpected errors
  res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
