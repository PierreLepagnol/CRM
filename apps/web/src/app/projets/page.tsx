"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@CRM-APP/ui/components/tabs";
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, useQuery } from "convex/react";
import { Kanban, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectKanban } from "@/components/project-kanban";
import { STATUTS, statutLabel, statutBadgeClass } from "@/lib/crm";
import { formatDate } from "@/lib/format";

export default function ProjetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get("view") === "liste" ? "liste" : "kanban";

  return (
    <AppShell
      title="Projets"
      actions={
        <div className="flex items-center gap-2">
          <Tabs value={view}>
            <TabsList>
              <TabsTrigger value="kanban" onClick={() => router.push("/projets")}>
                <Kanban className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="liste" onClick={() => router.push("/projets?view=liste")}>
                <List className="size-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <NewProjectDialog />
        </div>
      }
    >
      <Authenticated>
        <div className="flex flex-col gap-4 p-4">
          {view === "kanban" ? <ProjectKanban /> : <ProjectsList />}
        </div>
      </Authenticated>
    </AppShell>
  );
}

function ProjectsList() {
  const projects = useQuery(api.projects.list, {});

  if (projects === undefined)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );

  if (projects.length === 0)
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
        Aucun projet. Créez votre premier projet !
      </div>
    );

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2 text-left font-medium">Titre</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Client</th>
            <th className="px-4 py-2 text-left font-medium">Statut</th>
            <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Fin prévue</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {projects.map((p) => (
            <tr key={p._id} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-2 font-medium">{p.titre}</td>
              <td className="px-4 py-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    p.type === "interne"
                      ? "border-blue-400 text-blue-600"
                      : "border-purple-400 text-purple-600",
                  )}
                >
                  {p.type === "interne" ? "Interne" : "Mission"}
                </Badge>
              </td>
              <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                {p.client ?? "—"}
              </td>
              <td className="px-4 py-2">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statutBadgeClass(p.statut))}>
                  {statutLabel(p.statut)}
                </span>
              </td>
              <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                {p.date_fin_prevue ? formatDate(p.date_fin_prevue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
