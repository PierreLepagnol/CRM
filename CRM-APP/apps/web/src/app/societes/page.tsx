"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Button } from "@CRM-APP/ui/components/button";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@CRM-APP/ui/components/table";
import { Authenticated, AuthLoading, Unauthenticated, usePaginatedQuery, useQuery } from "convex/react";
import { Download } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { NewSocieteDialog } from "@/components/new-societe-dialog";
import { downloadCsv } from "@/lib/export";
import { formatDate } from "@/lib/format";

export default function SocietesPage() {
  return (
    <AppShell title="Sociétés" actions={<NewSocieteDialog />}>
      <AuthLoading><TableSkeleton /></AuthLoading>
      <Authenticated><SocietesList /></Authenticated>
      <Unauthenticated>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour voir les sociétés.
        </p>
      </Unauthenticated>
    </AppShell>
  );
}

function SocietesList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.societes.list,
    {},
    { initialNumItems: 50 },
  );
  const exportData = useQuery(api.exports.tables, {});

  if (status === "LoadingFirstPage") return <TableSkeleton />;

  return (
    <div className="flex flex-col">
      <div className="flex justify-end p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!exportData}
          onClick={() => exportData && downloadCsv("societes.csv", exportData.societes)}
        >
          <Download data-icon="inline-start" />
          Exporter CSV
        </Button>
      </div>
      <Table>
        <TableHeader className="bg-muted/40 text-xs text-muted-foreground">
          <TableRow>
            <TableHead className="px-4">Nom</TableHead>
            <TableHead className="px-4">Ville</TableHead>
            <TableHead className="px-4">Secteur</TableHead>
            <TableHead className="px-4">Effectif</TableHead>
            <TableHead className="px-4">Mise à jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                Aucune société. Créez-en une avec le bouton en haut.
              </TableCell>
            </TableRow>
          ) : (
            results.map((s) => (
              <TableRow key={s._id}>
                <TableCell className="px-4">
                  <Link
                    href={`/societes/${s._id}` as any}
                    className="font-medium hover:underline"
                  >
                    {s.nom}
                  </Link>
                </TableCell>
                <TableCell className="px-4 text-muted-foreground">{s.ville ?? "—"}</TableCell>
                <TableCell className="px-4 text-muted-foreground">{s.secteur ?? "—"}</TableCell>
                <TableCell className="px-4 text-muted-foreground">
                  {s.effectif != null ? `${s.effectif} emp.` : "—"}
                </TableCell>
                <TableCell className="px-4 text-muted-foreground">
                  {formatDate(s.updated_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {status === "CanLoadMore" && (
        <div className="flex justify-center p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => loadMore(50)}
          >
            Charger plus
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="flex justify-center p-4">
          <span className="text-sm text-muted-foreground">Chargement…</span>
        </div>
      )}

      <div className="px-4 py-2 text-xs text-muted-foreground">
        {results.length} société{results.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
