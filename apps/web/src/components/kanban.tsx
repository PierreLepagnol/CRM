"use client";

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
import { useMemo, useState } from "react";

type AnyId = string;
type ItemWithId = { _id: AnyId };

export function useDndKanban<TCol extends string, TItem extends ItemWithId>({
  columns,
  queryData,
  onMove,
}: {
  columns: readonly { id: TCol; label: string }[];
  queryData: Map<TCol, TItem[]> | undefined;
  onMove: (id: AnyId, newCol: TCol, targetIndex: number) => void;
}) {
  const emptyByCol = useMemo(() => new Map(columns.map((c) => [c.id, []])), [columns]);
  const [lastQueryData, setLastQueryData] = useState(queryData);
  const [optimisticByCol, setOptimisticByCol] = useState<Map<TCol, TItem[]> | null>(null);
  const [activeId, setActiveId] = useState<AnyId | null>(null);

  if (queryData !== lastQueryData) {
    setLastQueryData(queryData);
    setOptimisticByCol(null);
  }

  const byCol = optimisticByCol ?? queryData ?? emptyByCol;

  const allItems = useMemo(() => Array.from(byCol.values()).flat(), [byCol]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function findCol(id: AnyId): TCol | null {
    if (columns.some((c) => c.id === id)) return id as TCol;
    for (const [col, items] of byCol) {
      if (items.some((item) => item._id === id)) return col;
    }
    return null;
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id as AnyId);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const draggedId = active.id as AnyId;
    const fromCol = findCol(draggedId);
    const toCol = findCol(over.id as AnyId);
    if (!fromCol || !toCol) return;

    const overIsColumn = columns.some((c) => c.id === over.id);
    const sourceItems = [...(byCol.get(fromCol) ?? [])];
    const fromIdx = sourceItems.findIndex((item) => item._id === draggedId);
    if (fromIdx === -1) return;
    const moved = sourceItems[fromIdx];

    let targetIndex: number;
    if (overIsColumn) {
      const targetItems = byCol.get(toCol) ?? [];
      targetIndex = fromCol === toCol ? targetItems.length - 1 : targetItems.length;
    } else {
      const targetItems = byCol.get(toCol) ?? [];
      targetIndex = targetItems.findIndex((item) => item._id === over.id);
      if (targetIndex === -1) targetIndex = targetItems.length;
    }

    if (fromCol === toCol && fromIdx === targetIndex) return;

    const next = new Map(byCol);
    if (fromCol === toCol) {
      const col = [...sourceItems];
      col.splice(fromIdx, 1);
      col.splice(targetIndex, 0, moved);
      next.set(fromCol, col);
    } else {
      const newSource = [...sourceItems];
      newSource.splice(fromIdx, 1);
      const newTarget = [...(byCol.get(toCol) ?? [])];
      newTarget.splice(targetIndex, 0, { ...moved });
      next.set(fromCol, newSource);
      next.set(toCol, newTarget);
    }
    setOptimisticByCol(next);
    onMove(draggedId, toCol, targetIndex);
  };

  return { byCol, sensors, activeId, allItems, onDragStart, onDragEnd };
}

export function KanbanBoard({
  sensors,
  onDragStart,
  onDragEnd,
  overlay,
  children,
}: {
  sensors: ReturnType<typeof useSensors>;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  overlay: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-3 pb-2">
        {children}
      </div>
      <DragOverlay>{overlay}</DragOverlay>
    </DndContext>
  );
}

export function KanbanColumn<TItem extends ItemWithId>({
  id,
  label,
  summary,
  items,
  emptyLabel,
  renderItem,
}: {
  id: string;
  label: string;
  summary?: React.ReactNode;
  items: TItem[];
  emptyLabel: string;
  renderItem: (item: TItem) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-col rounded-lg border bg-muted/30 transition-colors",
        isOver && "border-foreground/30 bg-muted/60",
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b px-3 py-2 text-sm font-medium">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>{label}</span>
          {summary && <span className="text-xs font-normal text-muted-foreground">{summary}</span>}
        </span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </header>
      <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed bg-background/50 p-6 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            items.map((item) => renderItem(item))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function SortableItem({
  id,
  onSelect,
  children,
}: {
  id: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onSelect(); }}
      className={cn("cursor-pointer touch-none select-none", isDragging && "opacity-30")}
    >
      {children}
    </div>
  );
}

export function KanbanSkeleton({ columns }: { columns: readonly { id: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-3 pb-2">
      {columns.map((col) => (
        <section key={col.id} className="flex min-w-0 flex-col rounded-lg border bg-muted/30">
          <header className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
            <span>{col.label}</span>
            <Skeleton className="h-3 w-6" />
          </header>
          <div className="flex flex-col gap-2 p-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </section>
      ))}
    </div>
  );
}
