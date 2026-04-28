"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@CRM-APP/ui/components/avatar";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Checkbox } from "@CRM-APP/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@CRM-APP/ui/components/table";
import { cn } from "@CRM-APP/ui/lib/utils";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { CalendarDays, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { DealDrawer } from "@/components/deal-drawer";
import { TagChips } from "@/components/tag-picker";
import { downloadCsv } from "@/lib/export";
import { formatDate, formatMontant, ownerColor, ownerInitials } from "@/lib/format";

type DealStage = Doc<"deals">["stage"];

const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualifie: "Qualifié",
  proposition: "Proposition",
  nego: "Négo",
  signe: "Signé",
  perdu: "Perdu",
};

const STAGE_COLORS: Record<DealStage, string> = {
  lead: "bg-slate-400",
  qualifie: "bg-sky-500",
  proposition: "bg-indigo-500",
  nego: "bg-amber-500",
  signe: "bg-emerald-500",
  perdu: "bg-rose-500",
};

type DealsTableFilters = {
  owner_id?: string;
  tag_id?: Id<"tags">;
  updated_since?: number;
};

export function DealsTable({ filters }: { filters?: DealsTableFilters }) {
  const { results: allResults, status, loadMore } = usePaginatedQuery(
    api.deals.list,
    { owner_id: filters?.owner_id, tag_id: filters?.tag_id },
    { initialNumItems: 50 },
  );

  const results = filters?.updated_since
    ? allResults.filter((d) => d.updated_at >= filters.updated_since!)
    : allResults;
  const [selectedId, setSelectedId] = useState<Id<"deals"> | null>(null);
  const [selected, setSelected] = useState<Set<Id<"deals">>>(new Set());
  const moveToStage = useMutation(api.deals.moveToStage);
  const removeDeal = useMutation(api.deals.remove);

  if (status === "LoadingFirstPage") return <TableSkeleton />;

  const toggleSelect = (id: Id<"deals">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((d) => d._id)));
  };

  const bulkDelete = async () => {
    if (!confirm(`Supprimer ${selected.size} deal(s) ?`)) return;
    try {
      await Promise.all([...selected].map((id) => removeDeal({ id })));
      toast.success(`${selected.size} deal(s) supprimé(s).`);
      setSelected(new Set());
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  const bulkStage = async (stage: DealStage) => {
    try {
      await Promise.all(
        [...selected].map((id) => moveToStage({ dealId: id, newStage: stage, targetIndex: 9999 })),
      );
      toast.success("Stage mis à jour.");
      setSelected(new Set());
    } catch {
      toast.error("Échec du changement de stage.");
    }
  };

  const STAGES: DealStage[] = ["lead", "qualifie", "proposition", "nego", "signe", "perdu"];
  const exportRows = () => {
    downloadCsv(
      selected.size > 0 ? "deals-selection.csv" : "deals.csv",
      results
        .filter((d) => selected.size === 0 || selected.has(d._id))
        .map((d) => ({
          titre: d.titre,
          stage: STAGE_LABELS[d.stage],
          montant: d.montant,
          devise: d.devise,
          probabilite: d.probabilite,
          closing: d.date_closing_prevue ? formatDate(d.date_closing_prevue) : "",
          owner: d.owner_id,
          updated_at: formatDate(d.updated_at),
        })),
    );
  };

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={exportRows}>
          <Download data-icon="inline-start" />
          Exporter CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} sélectionné(s)</span>
          <div className="flex items-center gap-2">
            <Select
              value=""
              onValueChange={(value) => bulkStage(value as DealStage)}
            >
              <SelectTrigger size="sm" className="w-40 bg-background">
                <SelectValue placeholder="Changer stage…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={bulkDelete}
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader className="bg-muted/40 text-xs text-muted-foreground">
          <TableRow>
            <TableHead className="w-10 px-3">
              <Checkbox
                checked={selected.size === results.length && results.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Sélectionner tous les deals"
              />
            </TableHead>
            <TableHead className="px-4">Titre</TableHead>
            <TableHead className="px-4">Société</TableHead>
            <TableHead className="px-4">Stage</TableHead>
            <TableHead className="px-4">Montant</TableHead>
            <TableHead className="px-4">Proba</TableHead>
            <TableHead className="px-4">Closing</TableHead>
            <TableHead className="px-4">Tags</TableHead>
            <TableHead className="px-4">Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                Aucun deal trouvé.
              </TableCell>
            </TableRow>
          ) : (
            results.map((d) => (
              <DealRow
                key={d._id}
                deal={d}
                selected={selected.has(d._id)}
                onToggle={() => toggleSelect(d._id)}
                onOpen={() => setSelectedId(d._id)}
              />
            ))
          )}
        </TableBody>
      </Table>

      {status === "CanLoadMore" && (
        <div className="flex justify-center p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => loadMore(50)}
          >
            Charger plus
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="flex justify-center p-4">
          <span className="text-sm text-muted-foreground">Chargement…</span>
        </div>
      )}

      <div className="px-4 py-2 text-xs text-muted-foreground">
        {results.length} deal{results.length !== 1 ? "s" : ""}
      </div>

      <DealDrawer dealId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

function DealRow({
  deal,
  selected,
  onToggle,
  onOpen,
}: {
  deal: Doc<"deals">;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const societe = useQuery(api.societes.get, { id: deal.societe_id });

  return (
    <TableRow className={cn(selected && "bg-muted/20")}>
      <TableCell className="px-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Sélectionner ${deal.titre}`}
        />
      </TableCell>
      <TableCell className="px-4">
        <Button
          type="button"
          variant="link"
          className="h-auto justify-start p-0 font-medium"
          onClick={onOpen}
        >
          {deal.titre}
        </Button>
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {societe ? (
          <Link href={`/societes/${deal.societe_id}` as any} className="hover:underline">
            {societe.nom}
          </Link>
        ) : (
          "…"
        )}
      </TableCell>
      <TableCell className="px-4">
        <Badge variant="secondary">
          <span className={`size-2 rounded-full ${STAGE_COLORS[deal.stage]}`} />
          {STAGE_LABELS[deal.stage]}
        </Badge>
      </TableCell>
      <TableCell className="px-4 tabular-nums font-medium">
        {formatMontant(deal.montant, deal.devise)}
      </TableCell>
      <TableCell className="px-4 tabular-nums text-muted-foreground">{deal.probabilite}%</TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {deal.date_closing_prevue ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays />
            {formatDate(deal.date_closing_prevue)}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="px-4">
        <TagChips ids={deal.tags} />
      </TableCell>
      <TableCell className="px-4">
        <Avatar size="sm" style={{ backgroundColor: ownerColor(deal.owner_id) }} title={deal.owner_id}>
          <AvatarFallback className="bg-transparent text-white">
            {ownerInitials(deal.owner_id)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
