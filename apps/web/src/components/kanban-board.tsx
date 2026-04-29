"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { cn } from "@CRM-APP/ui/lib/utils";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { DealCard } from "@/components/deal-card";
import { DealDrawer } from "@/components/deal-drawer";
import { formatMontant } from "@/lib/format";

type DealStage = Doc<"deals">["stage"];

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "qualifie", label: "Qualifié" },
  { id: "proposition", label: "Proposition" },
  { id: "nego", label: "Négo" },
  { id: "signe", label: "Signé" },
  { id: "perdu", label: "Perdu" },
] as const satisfies ReadonlyArray<{ id: DealStage; label: string }>;

type KanbanFilters = {
  owner_id?: string;
  tag_id?: Id<"tags">;
  updated_since?: number;
};

export function KanbanBoard({ filters }: { filters?: KanbanFilters }) {
  const queryDeals = useQuery(api.deals.listForKanban, {
    owner_id: filters?.owner_id,
    tag_id: filters?.tag_id,
    updated_since: filters?.updated_since,
  });
  const move = useMutation(api.deals.moveToStage);

  const [byStage, setByStage] = useState<Map<DealStage, Doc<"deals">[]>>(
    () => new Map(STAGES.map((s) => [s.id, []])),
  );
  const [activeId, setActiveId] = useState<Id<"deals"> | null>(null);
  const [selectedId, setSelectedId] = useState<Id<"deals"> | null>(null);

  // Sync local optimistic state with the live Convex query.
  useEffect(() => {
    if (!queryDeals) return;
    const next = new Map<DealStage, Doc<"deals">[]>(
      STAGES.map((s) => [s.id, [] as Doc<"deals">[]]),
    );
    for (const deal of queryDeals) next.get(deal.stage)?.push(deal);
    setByStage(next);
  }, [queryDeals]);

  const allDeals = useMemo(
    () => Array.from(byStage.values()).flat(),
    [byStage],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  function findStage(id: string): DealStage | null {
    if (STAGES.some((s) => s.id === id)) return id as DealStage;
    for (const [stage, deals] of byStage) {
      if (deals.some((d) => d._id === id)) return stage;
    }
    return null;
  }

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as Id<"deals">);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as Id<"deals">;
    const activeStage = findStage(activeId);
    const overStage = findStage(over.id as string);
    if (!activeStage || !overStage) return;

    const overIsColumn = STAGES.some((s) => s.id === over.id);
    const overId = over.id as string;

    // Snapshot current state
    const sourceCol = [...(byStage.get(activeStage) ?? [])];
    const fromIdx = sourceCol.findIndex((d) => d._id === activeId);
    if (fromIdx === -1) return;
    const movedDeal = sourceCol[fromIdx];

    // Compute target index (final position in target column)
    let targetIndex: number;
    if (overIsColumn) {
      const targetCol = byStage.get(overStage) ?? [];
      targetIndex =
        activeStage === overStage ? targetCol.length - 1 : targetCol.length;
    } else {
      const targetCol = byStage.get(overStage) ?? [];
      targetIndex = targetCol.findIndex((d) => d._id === overId);
      if (targetIndex === -1) targetIndex = targetCol.length;
    }

    // No-op cases
    if (activeStage === overStage && fromIdx === targetIndex) return;

    // Optimistic local update
    const next = new Map(byStage);
    if (activeStage === overStage) {
      const col = [...sourceCol];
      col.splice(fromIdx, 1);
      col.splice(targetIndex, 0, movedDeal);
      next.set(activeStage, col);
    } else {
      const newSource = [...sourceCol];
      newSource.splice(fromIdx, 1);
      const newTarget = [...(byStage.get(overStage) ?? [])];
      newTarget.splice(targetIndex, 0, { ...movedDeal, stage: overStage });
      next.set(activeStage, newSource);
      next.set(overStage, newTarget);
    }
    setByStage(next);

    // Dispatch mutation; let the next query refresh reconcile.
    void move({ dealId: activeId, newStage: overStage, targetIndex });
  };

  if (queryDeals === undefined) return <KanbanSkeleton />;

  const activeDeal = activeId
    ? allDeals.find((d) => d._id === activeId)
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {STAGES.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              deals={byStage.get(stage.id) ?? []}
              onSelect={setSelectedId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>

      <DealDrawer
        dealId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

function Column({
  stage,
  deals,
  onSelect,
}: {
  stage: { id: DealStage; label: string };
  deals: Doc<"deals">[];
  onSelect: (id: Id<"deals">) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((acc, d) => acc + d.montant, 0);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
        isOver && "border-foreground/30 bg-muted/60",
      )}
    >
      <header className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
        <span>{stage.label}</span>
        <span className="text-xs text-muted-foreground">
          {deals.length} · {formatMontant(total)}
        </span>
      </header>

      <SortableContext
        items={deals.map((d) => d._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 p-2">
          {deals.length === 0 ? (
            <div className="rounded-md border border-dashed bg-background/50 p-6 text-center text-xs text-muted-foreground">
              Aucun deal
            </div>
          ) : (
            deals.map((deal) => (
              <SortableDealCard
                key={deal._id}
                deal={deal}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableDealCard({
  deal,
  onSelect,
}: {
  deal: Doc<"deals">;
  onSelect: (id: Id<"deals">) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onSelect(deal._id);
      }}
      className={cn(
        "cursor-pointer touch-none select-none",
        isDragging && "opacity-30",
      )}
    >
      <DealCard deal={deal} />
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {STAGES.map((stage) => (
        <section
          key={stage.id}
          className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
        >
          <header className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
            <span>{stage.label}</span>
            <Skeleton className="h-3 w-12" />
          </header>
          <div className="flex flex-col gap-2 p-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </section>
      ))}
    </div>
  );
}
