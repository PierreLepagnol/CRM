"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

export type PageKey = "pipeline" | "contacts" | "entreprises" | "projets" | "admin";
export type RoleKey = "admin" | "commercial" | "lecteur";

/**
 * Source de vérité côté front pour le contrôle d'accès basé sur le rôle.
 * Garantit également qu'une ligne `app_users` existe pour l'utilisateur
 * courant (couvre les comptes SSO créés avant l'ajout des triggers).
 */
export function useAccess() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.access.getMe, isAuthenticated ? {} : "skip");
  const ensureSelf = useMutation(api.users.ensureSelf);
  const ensured = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !ensured.current) {
      ensured.current = true;
      void ensureSelf({});
    }
  }, [isAuthenticated, ensureSelf]);

  const allowedPages = (me?.allowedPages ?? []) as PageKey[];

  return {
    me: me ?? null,
    role: (me?.role ?? null) as RoleKey | null,
    allowedPages,
    isAdmin: me?.role === "admin",
    isLoading: isAuthenticated && me === undefined,
    can: (page: PageKey) => allowedPages.includes(page),
  };
}
