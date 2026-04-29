"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { cn } from "@CRM-APP/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { STATUTS, type ProjectStatut } from "@/lib/crm";
import { formatDate } from "@/lib/format";
import { KanbanBoard, KanbanColumn, KanbanSkeleton, SortableItem, useDndKanban } from "./kanban";
import { ProjectSheet } from "./project-sheet";

type ProjectDoc = Doc<"projects">;

function useAllStatuts(): Map<ProjectStatut, ProjectDoc[]> | undefined {
  const aDemarrer = useQuery(api.projects.listByStatut, { statut: "a_demarrer" });
  const enCours = useQuery(api.projects.listByStatut, { statut: "en_cours" });
  const enRevision = useQuery(api.projects.listByStatut, { statut: "en_revision" });
  const termine = useQuery(api.projects.listByStatut, { statut: "termine" });

  if ([aDemarrer, enCours, enRevision, termine].some((v) => v === undefined)) return undefined;

  return new Map<ProjectStatut, ProjectDoc[]>([
    ["a_demarrer", aDemarrer ?? []],
    ["en_cours", enCours ?? []],
    ["en_revision", enRevision ?? []],
    ["termine", termine ?? []],
  ]);
}

export function ProjectKanban() {
  const queryData = useAllStatuts();
  const move = useMutation(api.projects.moveToStatut);
  const [selectedId, setSelectedId] = useState<Id<"projects"> | null>(null);

  const { byCol, sensors, activeId, allItems, onDragStart, onDragEnd } = useDndKanban({
    columns: STATUTS,
    queryData,
    onMove: (id, newCol, targetIndex) =>
      void move({ id: id as Id<"projects">, newStatut: newCol, targetIndex }),
  });

  if (queryData === undefined) return <KanbanSkeleton columns={STATUTS} />;

  const activeProject = activeId ? allItems.find((p) => p._id === activeId) ?? null : null;

  return (
    <>
      <KanbanBoard
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        overlay={activeProject ? <ProjectCard project={activeProject as ProjectDoc} /> : null}
      >
        {STATUTS.map((statut) => (
          <KanbanColumn
            key={statut.id}
            id={statut.id}
            label={statut.label}
            items={(byCol.get(statut.id) ?? []) as ProjectDoc[]}
            emptyLabel="Aucun projet"
            renderItem={(project) => (
              <SortableItem
                key={project._id}
                id={project._id}
                onSelect={() => setSelectedId(project._id as Id<"projects">)}
              >
                <ProjectCard project={project} />
              </SortableItem>
            )}
          />
        ))}
      </KanbanBoard>

      <ProjectSheet projectId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

function ProjectCard({ project }: { project: ProjectDoc }) {
  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-medium leading-tight">{project.titre}</span>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-xs",
            project.type === "interne"
              ? "border-blue-400 text-blue-600"
              : "border-purple-400 text-purple-600",
          )}
        >
          {project.type === "interne" ? "Interne" : "Mission"}
        </Badge>
      </div>
      {project.client && (
        <div className="text-xs text-muted-foreground">{project.client}</div>
      )}
      {(project.date_debut || project.date_fin_prevue) && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          {project.date_debut && formatDate(project.date_debut)}
          {project.date_debut && project.date_fin_prevue && " → "}
          {project.date_fin_prevue && formatDate(project.date_fin_prevue)}
        </div>
      )}
    </div>
  );
}
