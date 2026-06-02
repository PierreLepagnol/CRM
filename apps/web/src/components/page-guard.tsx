"use client";

import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { useAccess, type PageKey } from "@/lib/use-access";

/**
 * Bloque le rendu d'une page si le rôle de l'utilisateur courant ne donne pas
 * accès à `pageKey`. L'absence d'authentification est gérée par `AppShell`
 * (redirection vers /).
 */
export function PageGuard({
  pageKey,
  children,
}: {
  pageKey: PageKey;
  children: ReactNode;
}) {
  const { can, isLoading, me } = useAccess();

  // Pendant le chargement de l'accès, afficher un squelette (et non une page
  // blanche). Doit être vérifié AVANT `me === null` car `me` vaut null tant que
  // la requête n'a pas résolu.
  if (isLoading) {
    return (
      <div data-testid="page-guard-loading" className="flex flex-col gap-2 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (me === null) return null; // non authentifié → AppShell redirige

  if (!can(pageKey)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-12 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <div className="text-lg font-semibold">Accès refusé</div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Vous n'avez pas les droits nécessaires pour consulter cette page.
          Contactez un administrateur si besoin.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
