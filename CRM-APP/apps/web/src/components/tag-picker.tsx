"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

type Scope = "societe" | "contact" | "deal";
type Entity =
  | { kind: "societe"; id: Id<"societes"> }
  | { kind: "contact"; id: Id<"contacts"> }
  | { kind: "deal"; id: Id<"deals"> };

export function TagChips({ ids }: { ids: Id<"tags">[] }) {
  const tags = useQuery(api.tags.list, {});
  if (tags === undefined) return <Skeleton className="h-5 w-24" />;
  const selected = tags.filter((tag) => ids.includes(tag._id));
  if (selected.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((tag) => (
        <Badge key={tag._id} variant="secondary" title={tag.label}>
          <span className="size-2 rounded-full" style={{ backgroundColor: tag.couleur }} />
          {tag.label}
        </Badge>
      ))}
    </div>
  );
}

export function TagPicker({
  scope,
  entity,
  value,
}: {
  scope: Scope;
  entity: Entity;
  value: Id<"tags">[];
}) {
  const tags = useQuery(api.tags.list, { scope });
  const setTags = useMutation(api.tags.setForEntity);

  if (tags === undefined) return <Skeleton className="h-8 w-full" />;

  const toggle = async (id: Id<"tags">) => {
    const next = value.includes(id) ? value.filter((tagId) => tagId !== id) : [...value, id];
    try {
      await setTags({ entity, tagIds: next });
      toast.success("Tags mis à jour.");
    } catch {
      toast.error("Échec de la mise à jour des tags.");
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = value.includes(tag._id);
        return (
          <Button
            key={tag._id}
            type="button"
            variant={active ? "secondary" : "outline"}
            size="xs"
            onClick={() => toggle(tag._id)}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: tag.couleur }} />
            {tag.label}
            {active ? <X className="size-3" /> : <Plus className="size-3" />}
          </Button>
        );
      })}
      {tags.length === 0 ? (
        <span className="text-xs text-muted-foreground">Aucun tag disponible.</span>
      ) : null}
    </div>
  );
}

