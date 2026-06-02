"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@CRM-APP/ui/components/select";
import { useMutation, useQuery } from "convex/react";
import { Bell, Building2, Euro, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@CRM-APP/ui/lib/utils";
import { formatDate, formatEuros } from "@/lib/format";
import { STAGES, type ContactStage } from "@/lib/crm";
import { useDndKanban, KanbanBoard, KanbanColumn, SortableItem, KanbanSkeleton } from "./kanban";
import {
  useAppUsers,
  userInitials,
  UserAvatarGroup,
  type AppUserOption,
} from "./user-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@CRM-APP/ui/components/avatar";

type ContactDoc = Doc<"contacts">;

function totalMontant(contacts: ContactDoc[]) {
  return contacts.reduce((total, contact) => total + (contact.montant ?? 0), 0);
}

function shouldShowMontantTotal(stage: ContactStage) {
  return stage === "proposition" || stage === "gagne";
}

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
  const [filterOwner, setFilterOwner] = useState<string | null>(null);

  const users = useAppUsers();
  const userMap = useMemo(() => {
    const map = new Map<string, AppUserOption>();
    for (const u of users) map.set(u.user_id, u);
    return map;
  }, [users]);

  // Identifiants des propriétaires présents dans le pipeline.
  const owners = useMemo(() => {
    if (!queryData) return [];
    const ids = new Set<string>();
    for (const contacts of queryData.values()) {
      for (const c of contacts) {
        if (c.owner_id) ids.add(c.owner_id);
      }
    }
    return [...ids].sort((a, b) =>
      (userMap.get(a)?.name ?? a).localeCompare(userMap.get(b)?.name ?? b, "fr"),
    );
  }, [queryData, userMap]);

  const colorMap = useMemo(() => {
    const map = new Map<string, { border: string; dot: string }>();
    owners.forEach((id, i) => {
      map.set(id, COMMERCIAL_COLORS[i % COMMERCIAL_COLORS.length]);
    });
    return map;
  }, [owners]);

  const filteredData = useMemo(() => {
    if (!queryData || !filterOwner) return queryData;
    const filtered = new Map<ContactStage, ContactDoc[]>();
    for (const [stage, contacts] of queryData) {
      filtered.set(stage, contacts.filter((c) => c.owner_id === filterOwner));
    }
    return filtered;
  }, [queryData, filterOwner]);

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
      {owners.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <Select value={filterOwner ?? ""} onValueChange={(v) => setFilterOwner(v || null)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les propriétaires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les propriétaires</SelectItem>
              {owners.map((id) => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block size-2.5 rounded-full", colorMap.get(id)?.dot)} />
                    {userMap.get(id)?.name ?? id}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterOwner && (
            <Button variant="ghost" size="sm" onClick={() => setFilterOwner(null)}>
              Réinitialiser
            </Button>
          )}
        </div>
      )}
      <KanbanBoard
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        overlay={activeContact ? <ContactCard contact={activeContact as ContactDoc} userMap={userMap} colorClass={colorMap.get((activeContact as ContactDoc).owner_id ?? "")?.border} /> : null}
      >
        {STAGES.map((stage) => {
          const contacts = (byCol.get(stage.id) ?? []) as ContactDoc[];

          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              label={stage.label}
              summary={shouldShowMontantTotal(stage.id) ? formatEuros(totalMontant(contacts)) : undefined}
              items={contacts}
              emptyLabel="Aucun contact"
              renderItem={(contact) => (
                <SortableItem
                  key={contact._id}
                  id={contact._id}
                  onSelect={() => router.push(`/contacts/${contact._id}`)}
                >
                  <ContactCard contact={contact as ContactDoc} userMap={userMap} colorClass={colorMap.get((contact as ContactDoc).owner_id ?? "")?.border} />
                </SortableItem>
              )}
            />
          );
        })}
      </KanbanBoard>
    </div>
  );
}

function ContactCard({
  contact,
  colorClass,
  userMap,
}: {
  contact: ContactDoc;
  colorClass?: string;
  userMap: Map<string, AppUserOption>;
}) {
  const owner = contact.owner_id ? userMap.get(contact.owner_id) : undefined;
  const responsibles = (contact.responsible_ids ?? [])
    .map((id) => userMap.get(id))
    .filter((u): u is AppUserOption => Boolean(u));
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
      <div className="mt-2 flex items-center gap-1 text-xs font-medium">
        <Euro className="size-3" />
        {formatEuros(contact.montant ?? 0)}
      </div>
      {contact.email && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="size-3" />
          <span className="truncate">{contact.email}</span>
        </div>
      )}
      {(owner || responsibles.length > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {owner ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar size="sm">
                {owner.image && <AvatarImage src={owner.image} alt={owner.name} />}
                <AvatarFallback>{userInitials(owner.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{owner.name}</span>
            </span>
          ) : (
            <span />
          )}
          {responsibles.length > 0 && <UserAvatarGroup users={responsibles} />}
        </div>
      )}
    </div>
  );
}
