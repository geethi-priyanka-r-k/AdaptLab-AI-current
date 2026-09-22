import type { NextFunction, Request, Response } from "express";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  accessToken: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getBearerToken(request: Request) {
  const header = request.header("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length).trim();
  return token || null;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url: url.replace(/\/+$/, ""), publishableKey } : null;
}

async function resolveSupabaseUser(token: string) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase authentication is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(`Supabase authentication returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as { id?: unknown; email?: unknown };
  if (typeof payload.id !== "string" || !UUID_PATTERN.test(payload.id)) return null;

  return {
    id: payload.id,
    email: typeof payload.email === "string" ? payload.email : undefined,
    accessToken: token,
  } satisfies AuthenticatedUser;
}

export async function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const token = getBearerToken(request);

  // This branch is intentionally test-only. It lets the API regression suite
  // exercise ownership without requiring a real Supabase project or token.
  if (process.env.NODE_ENV === "test") {
    const testUserId = request.header("x-test-user-id");
    if (testUserId && UUID_PATTERN.test(testUserId)) {
      request.user = {
        id: testUserId,
        accessToken: token ?? `test-token:${testUserId}`,
      };
      next();
      return;
    }
  }

  if (!token) {
    next();
    return;
  }

  try {
    request.user = (await resolveSupabaseUser(token)) ?? undefined;
    next();
  } catch (error) {
    response.status(503).json({
      error:
        error instanceof Error
          ? error.message
          : "Authentication service is unavailable.",
    });
  }
}

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!request.user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}