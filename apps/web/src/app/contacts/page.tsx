"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Button } from "@CRM-APP/ui/components/button";
import { Input } from "@CRM-APP/ui/components/input";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, useQuery } from "convex/react";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { NewContactDialog } from "@/components/new-contact-dialog";
import { stageLabel, stageBadgeClass } from "@/lib/crm";
import { formatDate, formatEuros } from "@/lib/format";
import { downloadCsv } from "@/lib/export";

type ContactDoc = Doc<"contacts">;

function exportContacts(contacts: ContactDoc[]) {
  downloadCsv(
    `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
    contacts.map((c) => ({
      Prénom: c.prenom,
      Nom: c.nom,
      Entreprise: c.entreprise ?? "",
      Email: c.email ?? "",
      Téléphone: c.telephone ?? "",
      Poste: c.poste ?? "",
      "Contact SCIAM": c.contact_sciam ?? "",
      Montant: formatEuros(c.montant ?? 0),
      Stage: stageLabel(c.stage),
      "Prochaine relance": c.next_relance_at ? formatDate(c.next_relance_at) : "",
    })),
  );
}

export default function ContactsPage() {
  return (
    <AppShell title="Contacts" actions={<NewContactDialog />}>
      <Authenticated>
        <ContactsList />
      </Authenticated>
    </AppShell>
  );
}

function ContactsList() {
  const [q, setQ] = useState("");
  const allContacts = useQuery(api.contacts.list, {});
  const searchResults = useQuery(api.contacts.search, q.trim() ? { q: q.trim() } : "skip");

  const contacts = q.trim() ? (searchResults ?? []) : (allContacts ?? []);
  const loading = q.trim() ? searchResults === undefined : allContacts === undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un contact…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => allContacts && exportContacts(allContacts)}
          disabled={!allContacts || allContacts.length === 0}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q.trim() ? "Aucun résultat." : "Aucun contact. Créez votre premier contact !"}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium">Nom</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Entreprise</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Email</th>
                <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Poste</th>
                <th className="px-4 py-2 text-left font-medium">Montant</th>
                <th className="px-4 py-2 text-left font-medium">Stage</th>
                <th className="hidden px-4 py-2 text-left font-medium xl:table-cell">Relance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c._id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link href={`/contacts/${c._id}`} className="font-medium hover:underline">
                      {c.prenom} {c.nom}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                    {c.entreprise ?? "—"}
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                    ) : "—"}
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
                    {c.poste ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">{formatEuros(c.montant ?? 0)}</td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", stageBadgeClass(c.stage))}>
                      {stageLabel(c.stage)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground xl:table-cell">
                    {c.next_relance_at ? formatDate(c.next_relance_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
