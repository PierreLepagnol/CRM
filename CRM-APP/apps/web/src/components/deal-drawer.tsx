"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Input } from "@CRM-APP/ui/components/input";
import { Label } from "@CRM-APP/ui/components/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { Separator } from "@CRM-APP/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@CRM-APP/ui/components/sheet";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { useMutation, useQuery } from "convex/react";
import { Building2, CalendarDays, Download, Trash2, Users } from "lucide-react";

import { LogReunionDialog } from "@/components/log-reunion-dialog";
import { TagPicker } from "@/components/tag-picker";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatDate, formatMontant, ownerColor } from "@/lib/format";
import { downloadHtmlPdf } from "@/lib/export";

type DealStage = Doc<"deals">["stage"];

const STAGES: ReadonlyArray<{ id: DealStage; label: string }> = [
  { id: "lead", label: "Lead" },
  { id: "qualifie", label: "Qualifié" },
  { id: "proposition", label: "Proposition" },
  { id: "nego", label: "Négo" },
  { id: "signe", label: "Signé" },
  { id: "perdu", label: "Perdu" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  created: "Créé",
  updated: "Mis à jour",
  stage_changed: "Stage modifié",
  meeting_logged: "Réunion ajoutée",
  note_added: "Note ajoutée",
  merged: "Fusionné",
};

type Props = {
  dealId: Id<"deals"> | null;
  onClose: () => void;
};

export function DealDrawer({ dealId, onClose }: Props) {
  return (
    <Sheet open={dealId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        {dealId ? <DealDrawerBody dealId={dealId} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DealDrawerBody({
  dealId,
  onClose,
}: {
  dealId: Id<"deals">;
  onClose: () => void;
}) {
  const deal = useQuery(api.deals.get, { id: dealId });

  if (deal === undefined) return <DrawerSkeleton />;
  if (deal === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Deal introuvable.
      </div>
    );
  }

  return <DealDrawerEditor deal={deal} onClose={onClose} />;
}

function DealDrawerEditor({
  deal,
  onClose,
}: {
  deal: Doc<"deals">;
  onClose: () => void;
}) {
  const societe = useQuery(api.societes.get, { id: deal.societe_id });
  const activity = useQuery(api.activity.listForEntity, {
    entity: { kind: "deal", id: deal._id },
    limit: 20,
  });
  const reunions = useQuery(api.reunions.listByEntity, {
    entity: { kind: "deal", id: deal._id },
  });
  const contacts = useQuery(api.contacts.listByDeal, { deal_id: deal._id });

  const updateDeal = useMutation(api.deals.update);
  const moveToStage = useMutation(api.deals.moveToStage);
  const removeDeal = useMutation(api.deals.remove);

  const [titre, setTitre] = useState(deal.titre);
  const [montant, setMontant] = useState(String(deal.montant));
  const [probabilite, setProbabilite] = useState(String(deal.probabilite));
  const [closingDate, setClosingDate] = useState(
    deal.date_closing_prevue
      ? new Date(deal.date_closing_prevue).toISOString().slice(0, 10)
      : "",
  );
  const [notes, setNotes] = useState(deal.notes_md ?? "");

  // Sync local state on deal update from server
  useEffect(() => {
    setTitre(deal.titre);
    setMontant(String(deal.montant));
    setProbabilite(String(deal.probabilite));
    setClosingDate(
      deal.date_closing_prevue
        ? new Date(deal.date_closing_prevue).toISOString().slice(0, 10)
        : "",
    );
    setNotes(deal.notes_md ?? "");
  }, [
    deal._id,
    deal.titre,
    deal.montant,
    deal.probabilite,
    deal.date_closing_prevue,
    deal.notes_md,
  ]);

  const persistTitre = async () => {
    if (titre === deal.titre) return;
    if (!titre.trim()) {
      setTitre(deal.titre);
      return;
    }
    try {
      await updateDeal({ id: deal._id, patch: { titre: titre.trim() } });
    } catch {
      toast.error("Échec de la mise à jour du titre.");
    }
  };

  const persistMontant = async () => {
    const num = Number(montant);
    if (!Number.isFinite(num) || num < 0) {
      setMontant(String(deal.montant));
      return;
    }
    if (num === deal.montant) return;
    try {
      await updateDeal({ id: deal._id, patch: { montant: num } });
    } catch {
      toast.error("Échec de la mise à jour du montant.");
    }
  };

  const persistProba = async () => {
    const num = Number(probabilite);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      setProbabilite(String(deal.probabilite));
      return;
    }
    if (num === deal.probabilite) return;
    try {
      await updateDeal({ id: deal._id, patch: { probabilite: num } });
    } catch {
      toast.error("Échec de la mise à jour de la probabilité.");
    }
  };

  const persistClosing = async () => {
    const ts = closingDate ? new Date(closingDate).getTime() : undefined;
    if (ts === deal.date_closing_prevue) return;
    try {
      await updateDeal({
        id: deal._id,
        patch: { date_closing_prevue: ts },
      });
    } catch {
      toast.error("Échec de la mise à jour de la date de closing.");
    }
  };

  const persistNotes = async () => {
    const next = notes.trim() ? notes : undefined;
    if ((next ?? null) === (deal.notes_md ?? null)) return;
    try {
      await updateDeal({ id: deal._id, patch: { notes_md: next } });
    } catch {
      toast.error("Échec de la mise à jour des notes.");
    }
  };

  const onStageChange = async (newStage: DealStage) => {
    if (newStage === deal.stage) return;
    try {
      await moveToStage({ dealId: deal._id, newStage, targetIndex: 0 });
      toast.success("Stage modifié.");
    } catch {
      toast.error("Échec du changement de stage.");
    }
  };

  const onDelete = async () => {
    if (!confirm(`Supprimer le deal "${deal.titre}" ?`)) return;
    try {
      await removeDeal({ id: deal._id });
      toast.success("Deal supprimé.");
      onClose();
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  const exportPdf = () => {
    downloadHtmlPdf(`deal-${deal._id}.html`, deal.titre, [
      ["Stage", deal.stage],
      ["Montant", formatMontant(deal.montant, deal.devise)],
      ["Probabilité", `${deal.probabilite}%`],
      ["Closing", deal.date_closing_prevue ? formatDate(deal.date_closing_prevue) : ""],
      ["Société", societe?.nom ?? ""],
      ["Notes", notes],
    ]);
  };

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-4 py-3">
        <SheetTitle className="sr-only">{deal.titre}</SheetTitle>
        <Input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onBlur={persistTitre}
          className="h-auto border-0 bg-transparent p-0 text-base font-semibold focus-visible:ring-0"
          aria-label="Titre"
        />
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {/* Header row */}
        <section className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Select
            value={deal.stage}
            onValueChange={(val) => onStageChange(val as DealStage)}
          >
            <SelectTrigger size="sm" aria-label="Stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <span
            className="inline-flex size-5 items-center justify-center rounded-full text-[10px] text-white"
            style={{ backgroundColor: ownerColor(deal.owner_id) }}
            title={`Owner : ${deal.owner_id}`}
          >
            <span className="sr-only">Owner</span>●
          </span>

          {deal.tags.length > 0 ? (
            <Badge variant="secondary">{deal.tags.length} tag{deal.tags.length > 1 ? "s" : ""}</Badge>
          ) : null}
        </section>

        <Separator />

        {/* Société */}
        <section className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-3.5" /> Société
          </div>
          <div className="mt-1.5">
            {societe === undefined ? (
              <Skeleton className="h-4 w-40" />
            ) : societe ? (
              <span className="text-sm font-medium">{societe.nom}</span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </section>

        <Separator />

        <section className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" /> Contacts
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-sm">
            {contacts === undefined ? (
              <Skeleton className="h-4 w-40" />
            ) : contacts.length === 0 ? (
              <span className="text-muted-foreground">Aucun contact lié.</span>
            ) : (
              contacts.map((contact) => (
                <span key={contact._id}>
                  {contact.prenom} {contact.nom}
                </span>
              ))
            )}
          </div>
        </section>

        <Separator />

        <section className="px-4 py-3">
          <h3 className="mb-2 text-sm font-medium">Tags</h3>
          <TagPicker scope="deal" entity={{ kind: "deal", id: deal._id }} value={deal.tags} />
        </section>

        <Separator />

        {/* Numbers */}
        <section className="grid grid-cols-2 gap-3 px-4 py-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-montant">Montant (€)</Label>
            <Input
              id="d-montant"
              type="number"
              min={0}
              step={100}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              onBlur={persistMontant}
            />
            <span className="text-xs text-muted-foreground">
              {formatMontant(deal.montant, deal.devise)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-proba">Probabilité (%)</Label>
            <Input
              id="d-proba"
              type="number"
              min={0}
              max={100}
              step={5}
              value={probabilite}
              onChange={(e) => setProbabilite(e.target.value)}
              onBlur={persistProba}
            />
          </div>
        </section>

        <section className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-closing" className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> Date de closing prévue
            </Label>
            <Input
              id="d-closing"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              onBlur={persistClosing}
            />
          </div>
        </section>

        <Separator />

        {/* Notes */}
        <section className="px-4 py-3">
          <Label htmlFor="d-notes">Notes</Label>
          <Textarea
            id="d-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={persistNotes}
            placeholder="Contexte, prochaines actions… (markdown supporté)"
            className="mt-1.5"
          />
        </section>

        <Separator />

        {/* Réunions */}
        <section className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Réunions</h3>
            <LogReunionDialog
              attachedTo={{ kind: "deal", id: deal._id }}
            />
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {reunions === undefined ? (
              <li>
                <Skeleton className="h-4 w-3/4" />
              </li>
            ) : reunions.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Aucune réunion enregistrée.
              </li>
            ) : (
              reunions.map((r) => (
                <li key={r._id} className="text-sm">
                  <span className="font-medium">{formatDate(r.date)}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {r.duree_minutes} min
                    {r.lieu_ou_url ? ` · ${r.lieu_ou_url}` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <Separator />

        {/* Activity */}
        <section className="px-4 py-3 pb-6">
          <h3 className="text-sm font-medium">Activité</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {activity === undefined ? (
              <li>
                <Skeleton className="h-4 w-3/4" />
              </li>
            ) : activity.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Aucune activité.
              </li>
            ) : (
              activity.map((a) => (
                <li key={a._id} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {formatDate(a._creationTime)}
                  </span>
                  <span>{ACTIVITY_LABELS[a.kind] ?? a.kind}</span>
                  {a.payload_json ? (
                    <span className="text-muted-foreground">
                      {summarizePayload(a.kind, a.payload_json)}
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="border-t bg-muted/40 px-4 py-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Download data-icon="inline-start" />
            Exporter PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 data-icon="inline-start" />
            Supprimer le deal
          </Button>
        </div>
      </div>
    </div>
  );
}

function summarizePayload(kind: string, payloadJson: string): string {
  try {
    const data = JSON.parse(payloadJson) as Record<string, unknown>;
    if (kind === "stage_changed") {
      const from = String(data.from ?? "");
      const to = String(data.to ?? "");
      return `${labelStage(from)} → ${labelStage(to)}`;
    }
    return "";
  } catch {
    return "";
  }
}

function labelStage(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

function DrawerSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Separator />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
