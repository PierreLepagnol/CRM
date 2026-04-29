"use client";

import { env } from "@CRM-APP/env/web";
import { Toaster } from "@CRM-APP/ui/components/sonner";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

import { ThemeProvider } from "./theme-provider";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

function useBetterAuthToken(initialToken?: string | null) {
  const normalizedInitialToken = initialToken ?? null;
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [lastInitialToken, setLastInitialToken] = useState<string | null>(normalizedInitialToken);
  const tokenRef = useRef<string | null>(initialToken ?? null);
  const pendingTokenRef = useRef<Promise<string | null> | null>(null);

  const setCachedToken = useCallback((nextToken: string | null) => {
    tokenRef.current = nextToken;
    setToken(nextToken);
  }, []);

  if (normalizedInitialToken !== lastInitialToken) {
    setLastInitialToken(normalizedInitialToken);
    setCachedToken(normalizedInitialToken);
  }

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken = false }: { forceRefreshToken?: boolean } = {}) => {
      if (tokenRef.current && !forceRefreshToken) {
        return tokenRef.current;
      }

      if (pendingTokenRef.current && !forceRefreshToken) {
        return pendingTokenRef.current;
      }

      pendingTokenRef.current = authClient.convex
        .token({ fetchOptions: { throw: false } })
        .then(({ data }) => {
          const nextToken = data?.token ?? null;
          setCachedToken(nextToken);
          return nextToken;
        })
        .catch(() => {
          setCachedToken(null);
          return null;
        })
        .finally(() => {
          pendingTokenRef.current = null;
        });

      return pendingTokenRef.current;
    },
    [setCachedToken]
  );

  useEffect(() => {
    return authClient.$store.listen("$sessionSignal", () => {
      pendingTokenRef.current = null;
      setCachedToken(null);
      void fetchAccessToken({ forceRefreshToken: true });
    });
  }, [fetchAccessToken, setCachedToken]);

  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: token !== null,
      fetchAccessToken,
    }),
    [fetchAccessToken, token]
  );
}

export default function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  const useAuth = useCallback(() => useBetterAuthToken(initialToken), [initialToken]);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
      <ThemeProvider defaultTheme="system" enableSystem>
        {children}
        <Toaster richColors />
      </ThemeProvider>
    </ConvexProviderWithAuth>
  );
}
