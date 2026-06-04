"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Input } from "@CRM-APP/ui/components/input";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Authenticated, useQuery } from "convex/react";
import { Building2, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { NewEntrepriseDialog } from "@/components/new-entreprise-dialog";
import { secteurLabel } from "@/lib/crm";
import { formatEuros } from "@/lib/format";

export default function EntreprisesPage() {
  return (
    <AppShell title="Entreprises" pageKey="entreprises" actions={<NewEntrepriseDialog />}>
      <Authenticated>
        <EntreprisesList />
      </Authenticated>
    </AppShell>
  );
}

type SortKey = "nom" | "contactCount" | "montantTotal";

function EntreprisesList() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "nom", dir: 1 });
  const entreprises = useQuery(api.entreprises.list, {});

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const needle = q.trim().toLocaleLowerCase("fr");
  const rows = (entreprises ?? [])
    .filter((e) => !needle || e.nom.toLocaleLowerCase("fr").includes(needle))
    .sort((a, b) => {
      if (sort.key === "nom") return a.nom.localeCompare(b.nom, "fr") * sort.dir;
      return (a[sort.key] - b[sort.key]) * sort.dir;
    });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher une entreprise…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {entreprises === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q.trim() ? "Aucun résultat." : "Aucune entreprise. Créez-en une !"}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <SortableTh label="Nom" active={sort.key === "nom"} dir={sort.dir} onClick={() => toggleSort("nom")} />
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Secteur</th>
                <SortableTh label="Contacts" active={sort.key === "contactCount"} dir={sort.dir} onClick={() => toggleSort("contactCount")} />
                <SortableTh label="Montant total" active={sort.key === "montantTotal"} dir={sort.dir} onClick={() => toggleSort("montantTotal")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => (
                <tr key={e._id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link
                      href={`/entreprises/${e._id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <Building2 className="size-4 shrink-0 text-muted-foreground" />
                      {e.nom}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                    {secteurLabel(e.secteur)}
                  </td>
                  <td className="px-4 py-2">{e.contactCount}</td>
                  <td className="px-4 py-2 font-medium">{formatEuros(e.montantTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-2 text-left font-medium">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && <span className="text-xs">{dir === 1 ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
