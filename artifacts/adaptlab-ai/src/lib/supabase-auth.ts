export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: { display_name?: string; name?: string };
  };
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: AuthSession["user"];
  error?: string;
  error_description?: string;
  msg?: string;
};

const storageKey = "adaptlab_supabase_session";

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;
  return url && publishableKey
    ? { url: url.replace(/\/+$/, ""), publishableKey }
    : null;
}

function readStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    return session.access_token && session.user?.id ? session : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (session) window.localStorage.setItem(storageKey, JSON.stringify(session));
  else window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
}

async function request(path: string, init: RequestInit = {}) {
  const settings = config();
  if (!settings) {
    throw new Error(
      "Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  const response = await fetch(`${settings.url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: settings.publishableKey,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json()) as AuthResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? body.msg ?? "Authentication failed.",
    );
  }
  return body;
}

function toSession(body: AuthResponse): AuthSession {
  if (!body.access_token || !body.user) {
    throw new Error(
      "Supabase did not return a session. Check whether email confirmation is required.",
    );
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    user: body.user,
  };
}

export const authClient = {
  isConfigured: () => Boolean(config()),
  getSession: async () => readStoredSession(),
  signIn: async (email: string, password: string) => {
    const body = await request("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const session = toSession(body);
    storeSession(session);
    return session;
  },
  signUp: async (email: string, password: string, name: string) => {
    const body = await request("/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { display_name: name },
      }),
    });
    if (!body.access_token) {
      return { session: null, confirmationRequired: true };
    }
    const session = toSession(body);
    storeSession(session);
    return { session, confirmationRequired: false };
  },
  signOut: async () => {
    const session = readStoredSession();
    const settings = config();
    if (session && settings) {
      await fetch(`${settings.url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: settings.publishableKey,
          authorization: `Bearer ${session.access_token}`,
        },
      });
    }
    storeSession(null);
  },
  subscribe: (listener: () => void) => {
    const handler = (event: StorageEvent) => {
      if (event.key === storageKey) listener();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};