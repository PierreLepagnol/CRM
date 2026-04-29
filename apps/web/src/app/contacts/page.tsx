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
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Download } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { NewContactDialog } from "@/components/new-contact-dialog";
import { downloadCsv } from "@/lib/export";
import { formatDate } from "@/lib/format";

export default function ContactsPage() {
  return (
    <AppShell title="Contacts" actions={<NewContactDialog />}>
      <AuthLoading><TableSkeleton /></AuthLoading>
      <Authenticated><ContactsList /></Authenticated>
      <Unauthenticated>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour voir les contacts.
        </p>
      </Unauthenticated>
    </AppShell>
  );
}

function ContactsList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.contacts.list,
    {},
    { initialNumItems: 50 },
  );
  const exportData = useQuery(api.exports.tables, {});

  if (status === "LoadingFirstPage") return <TableSkeleton />;

  const NIVEAU_LABELS: Record<string, string> = {
    decideur: "Décideur",
    prescripteur: "Prescripteur",
    utilisateur: "Utilisateur",
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-end p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!exportData}
          onClick={() => exportData && downloadCsv("contacts.csv", exportData.contacts)}
        >
          <Download data-icon="inline-start" />
          Exporter CSV
        </Button>
      </div>
      <Table>
        <TableHeader className="bg-muted/40 text-xs text-muted-foreground">
          <TableRow>
            <TableHead className="px-4">Nom</TableHead>
            <TableHead className="px-4">Société</TableHead>
            <TableHead className="px-4">Poste</TableHead>
            <TableHead className="px-4">Email</TableHead>
            <TableHead className="px-4">Niveau</TableHead>
            <TableHead className="px-4">Mise à jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                Aucun contact. Créez-en un avec le bouton en haut.
              </TableCell>
            </TableRow>
          ) : (
            results.map((c) => (
              <ContactRow key={c._id} contact={c} niveauLabels={NIVEAU_LABELS} />
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
        {results.length} contact{results.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  niveauLabels,
}: {
  contact: {
    _id: Id<"contacts">;
    prenom: string;
    nom: string;
    societe_id?: Id<"societes">;
    intitule_poste?: string;
    email?: string;
    niveau_decision?: string;
    updated_at: number;
  };
  niveauLabels: Record<string, string>;
}) {
  const societe = useQuery(
    api.societes.get,
    contact.societe_id ? { id: contact.societe_id } : "skip",
  );

  return (
    <TableRow>
      <TableCell className="px-4">
        <Link href={`/contacts/${contact._id}` as any} className="font-medium hover:underline">
          {contact.prenom} {contact.nom}
        </Link>
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {contact.societe_id ? (
          societe ? (
            <Link href={`/societes/${contact.societe_id!}` as any} className="hover:underline">
              {societe.nom}
            </Link>
          ) : (
            "…"
          )
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">{contact.intitule_poste ?? "—"}</TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="hover:underline">
            {contact.email}
          </a>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {contact.niveau_decision ? niveauLabels[contact.niveau_decision] ?? contact.niveau_decision : "—"}
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">{formatDate(contact.updated_at)}</TableCell>
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
