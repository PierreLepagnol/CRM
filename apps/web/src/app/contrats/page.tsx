"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
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
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, AuthLoading, Unauthenticated, usePaginatedQuery, useQuery } from "convex/react";
import { Download } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { downloadCsv } from "@/lib/export";
import { formatDate, formatMontant } from "@/lib/format";

export default function ContratsPage() {
  return (
    <AppShell title="Contrats">
      <AuthLoading><TableSkeleton /></AuthLoading>
      <Authenticated><ContratsList /></Authenticated>
      <Unauthenticated>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour voir les contrats.
        </p>
      </Unauthenticated>
    </AppShell>
  );
}

const STATUT_LABELS: Record<Doc<"contrats">["statut"], string> = {
  actif: "Actif",
  en_pause: "En pause",
  termine: "Terminé",
  resilie: "Résilié",
};

const STATUT_COLORS: Record<Doc<"contrats">["statut"], string> = {
  actif: "bg-emerald-500",
  en_pause: "bg-amber-500",
  termine: "bg-slate-400",
  resilie: "bg-rose-500",
};

const FREQ_LABELS: Record<Doc<"contrats">["frequence_facturation"], string> = {
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
  unique: "Unique",
};

function ContratsList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.contrats.list,
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
          onClick={() => exportData && downloadCsv("contrats.csv", exportData.contrats)}
        >
          <Download data-icon="inline-start" />
          Exporter CSV
        </Button>
      </div>
      <Table>
        <TableHeader className="bg-muted/40 text-xs text-muted-foreground">
          <TableRow>
            <TableHead className="px-4">Société</TableHead>
            <TableHead className="px-4">Statut</TableHead>
            <TableHead className="px-4">Montant total</TableHead>
            <TableHead className="px-4">Fréquence</TableHead>
            <TableHead className="px-4">Signature</TableHead>
            <TableHead className="px-4">Début</TableHead>
            <TableHead className="px-4">Fin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                Aucun contrat. Les contrats sont créés automatiquement quand un deal passe en Signé.
              </TableCell>
            </TableRow>
          ) : (
            results.map((c) => (
              <ContratRow key={c._id} contrat={c} />
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
        {results.length} contrat{results.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function ContratRow({ contrat }: { contrat: Doc<"contrats"> }) {
  const societe = useQuery(api.societes.get, { id: contrat.societe_id });
  const deal = useQuery(api.deals.get, { id: contrat.deal_id });

  return (
    <TableRow>
      <TableCell className="px-4">
        {societe ? (
          <Link href={`/contrats/${contrat._id}` as any} className="font-medium hover:underline">
            {societe.nom}
          </Link>
        ) : (
          <span className="text-muted-foreground">…</span>
        )}
        {deal && (
          <div className="truncate max-w-[180px] text-xs text-muted-foreground">{deal.titre}</div>
        )}
      </TableCell>
      <TableCell className="px-4">
        <Badge variant="secondary">
          <span className={cn("size-2 rounded-full", STATUT_COLORS[contrat.statut])} />
          {STATUT_LABELS[contrat.statut]}
        </Badge>
      </TableCell>
      <TableCell className="px-4 font-medium tabular-nums">
        {formatMontant(contrat.montant_total, contrat.devise)}
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {FREQ_LABELS[contrat.frequence_facturation]}
      </TableCell>
      <TableCell className="px-4 tabular-nums text-muted-foreground">
        {formatDate(contrat.date_signature)}
      </TableCell>
      <TableCell className="px-4 tabular-nums text-muted-foreground">
        {formatDate(contrat.date_debut)}
      </TableCell>
      <TableCell className="px-4 tabular-nums text-muted-foreground">
        {contrat.date_fin ? formatDate(contrat.date_fin) : "—"}
      </TableCell>
    </TableRow>
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
