"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@CRM-APP/ui/components/select";
import { useMutation, useQuery } from "convex/react";
import { Bell, Building2, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@CRM-APP/ui/lib/utils";
import { formatDate } from "@/lib/format";
import { STAGES, type ContactStage } from "@/lib/crm";
import { useDndKanban, KanbanBoard, KanbanColumn, SortableItem, KanbanSkeleton } from "./kanban";

type ContactDoc = Doc<"contacts">;

const COMMERCIAL_COLORS: { border: string; dot: string }[] = [
  { border: "border-l-blue-500", dot: "bg-blue-500" },
  { border: "border-l-violet-500", dot: "bg-violet-500" },
  { border: "border-l-emerald-500", dot: "bg-emerald-500" },
  { border: "border-l-amber-500", dot: "bg-amber-500" },
  { border: "border-l-rose-500", dot: "bg-rose-500" },
  { border: "border-l-cyan-500", dot: "bg-cyan-500" },
  { border: "border-l-orange-500", dot: "bg-orange-500" },
  { border: "border-l-pink-500", dot: "bg-pink-500" },
];

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
  const [filterCommercial, setFilterCommercial] = useState<string | null>(null);

  const commerciaux = useMemo(() => {
    if (!queryData) return [];
    const names = new Set<string>();
    for (const contacts of queryData.values()) {
      for (const c of contacts) {
        if (c.contact_sciam) names.add(c.contact_sciam);
      }
    }
    return [...names].sort();
  }, [queryData]);

  const colorMap = useMemo(() => {
    const map = new Map<string, { border: string; dot: string }>();
    commerciaux.forEach((name, i) => {
      map.set(name, COMMERCIAL_COLORS[i % COMMERCIAL_COLORS.length]);
    });
    return map;
  }, [commerciaux]);

  const filteredData = useMemo(() => {
    if (!queryData || !filterCommercial) return queryData;
    const filtered = new Map<ContactStage, ContactDoc[]>();
    for (const [stage, contacts] of queryData) {
      filtered.set(stage, contacts.filter((c) => c.contact_sciam === filterCommercial));
    }
    return filtered;
  }, [queryData, filterCommercial]);

  const { byCol, sensors, activeId, allItems, onDragStart, onDragEnd } = useDndKanban({
    columns: STAGES,
    queryData: filteredData,
    onMove: (id, newCol, targetIndex) =>
      void move({ id: id as Id<"contacts">, newStage: newCol, targetIndex }),
  });

  if (queryData === undefined) return <KanbanSkeleton columns={STAGES} />;

  const activeContact = activeId ? allItems.find((c) => c._id === activeId) ?? null : null;

  return (
    <div>
      {commerciaux.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <Select value={filterCommercial ?? ""} onValueChange={(v) => setFilterCommercial(v || null)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les commerciaux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les commerciaux</SelectItem>
              {commerciaux.map((name) => (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block size-2.5 rounded-full", colorMap.get(name)?.dot)} />
                    {name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterCommercial && (
            <Button variant="ghost" size="sm" onClick={() => setFilterCommercial(null)}>
              Réinitialiser
            </Button>
          )}
        </div>
      )}
      <KanbanBoard
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        overlay={activeContact ? <ContactCard contact={activeContact as ContactDoc} colorClass={colorMap.get((activeContact as ContactDoc).contact_sciam ?? "")?.border} /> : null}
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
                <ContactCard contact={contact as ContactDoc} colorClass={colorMap.get((contact as ContactDoc).contact_sciam ?? "")?.border} />
              </SortableItem>
            )}
          />
        ))}
      </KanbanBoard>
    </div>
  );
}

function ContactCard({ contact, colorClass }: { contact: ContactDoc; colorClass?: string }) {
  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const relanceTs = contact.next_relance_at;
  const relanceOverdue = relanceTs !== undefined && relanceTs < now;
  const relanceToday = relanceTs !== undefined && relanceTs <= todayEnd.getTime() && !relanceOverdue;

  return (
    <div className={cn("rounded-md border bg-card p-3 shadow-sm", colorClass && `border-l-4 ${colorClass}`)}>
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
