"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { useMutation, useQuery } from "convex/react";
import { Bell, Building2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@CRM-APP/ui/lib/utils";
import { formatDate } from "@/lib/format";
import { STAGES, type ContactStage } from "@/lib/crm";
import { useDndKanban, KanbanBoard, KanbanColumn, SortableItem, KanbanSkeleton } from "./kanban";

type ContactDoc = Doc<"contacts">;

function useAllStages(): Map<ContactStage, ContactDoc[]> | undefined {
  const nouveau = useQuery(api.contacts.listByStage, { stage: "nouveau" });
  const contacte = useQuery(api.contacts.listByStage, { stage: "contacte" });
  const rdv = useQuery(api.contacts.listByStage, { stage: "rdv" });
  const proposition = useQuery(api.contacts.listByStage, { stage: "proposition" });
  const gagne = useQuery(api.contacts.listByStage, { stage: "gagne" });
  const perdu = useQuery(api.contacts.listByStage, { stage: "perdu" });

  const all = [nouveau, contacte, rdv, proposition, gagne, perdu];
  if (all.some((v) => v === undefined)) return undefined;

  return new Map<ContactStage, ContactDoc[]>([
    ["nouveau", nouveau ?? []],
    ["contacte", contacte ?? []],
    ["rdv", rdv ?? []],
    ["proposition", proposition ?? []],
    ["gagne", gagne ?? []],
    ["perdu", perdu ?? []],
  ]);
}

export function ContactKanban() {
  const queryData = useAllStages();
  const move = useMutation(api.contacts.moveToStage);
  const router = useRouter();

  const { byCol, sensors, activeId, allItems, onDragStart, onDragEnd } = useDndKanban({
    columns: STAGES,
    queryData,
    onMove: (id, newCol, targetIndex) =>
      void move({ id: id as Id<"contacts">, newStage: newCol, targetIndex }),
  });

  if (queryData === undefined) return <KanbanSkeleton columns={STAGES} />;

  const activeContact = activeId ? allItems.find((c) => c._id === activeId) ?? null : null;

  return (
    <KanbanBoard
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      overlay={activeContact ? <ContactCard contact={activeContact as ContactDoc} /> : null}
    >
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          id={stage.id}
          label={stage.label}
          items={(byCol.get(stage.id) ?? []) as ContactDoc[]}
          emptyLabel="Aucun contact"
          renderItem={(contact) => (
            <SortableItem
              key={contact._id}
              id={contact._id}
              onSelect={() => router.push(`/contacts/${contact._id}`)}
            >
              <ContactCard contact={contact} />
            </SortableItem>
          )}
        />
      ))}
    </KanbanBoard>
  );
}

function ContactCard({ contact }: { contact: ContactDoc }) {
  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const relanceTs = contact.next_relance_at;
  const relanceOverdue = relanceTs !== undefined && relanceTs < now;
  const relanceToday = relanceTs !== undefined && relanceTs <= todayEnd.getTime() && !relanceOverdue;

  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-medium leading-tight">
          {contact.prenom} {contact.nom}
        </span>
        {relanceTs && (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs",
              relanceOverdue && "border-rose-500 text-rose-600",
              relanceToday && "border-orange-400 text-orange-600",
              !relanceOverdue && !relanceToday && "border-muted-foreground/30 text-muted-foreground",
            )}
          >
            <Bell className="mr-1 size-2.5" />
            {formatDate(relanceTs)}
          </Badge>
        )}
      </div>
      {contact.entreprise && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="size-3" />
          {contact.entreprise}
        </div>
      )}
      {contact.poste && (
        <div className="mt-0.5 text-xs text-muted-foreground">{contact.poste}</div>
      )}
      {contact.email && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="size-3" />
          <span className="truncate">{contact.email}</span>
        </div>
      )}
    </div>
  );
}
