"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Button } from "@CRM-APP/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@CRM-APP/ui/components/dialog";
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
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STAGES: ReadonlyArray<{ id: Doc<"deals">["stage"]; label: string; defaultProba: number }> = [
  { id: "lead", label: "Lead", defaultProba: 10 },
  { id: "qualifie", label: "Qualifié", defaultProba: 25 },
  { id: "proposition", label: "Proposition", defaultProba: 50 },
  { id: "nego", label: "Négo", defaultProba: 75 },
  { id: "signe", label: "Signé", defaultProba: 100 },
  { id: "perdu", label: "Perdu", defaultProba: 0 },
];

type Props = {
  /** Stage présélectionné si on ouvre depuis un header de colonne. */
  defaultStage?: Doc<"deals">["stage"];
  /** Custom trigger element ; si absent, un bouton "Nouveau deal" est rendu. */
  trigger?: React.ReactElement;
};

export function NewDealDialog({ defaultStage = "lead", trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Nouveau deal
            </Button>
          )
        }
      />
      {open ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau deal</DialogTitle>
          </DialogHeader>
          <NewDealForm
            defaultStage={defaultStage}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function NewDealForm({
  defaultStage,
  onSuccess,
  onCancel,
}: {
  defaultStage: Doc<"deals">["stage"];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const societes = useQuery(api.societes.listForPicker, isAuthenticated ? {} : "skip");
  const createDeal = useMutation(api.deals.create);
  const createSociete = useMutation(api.societes.create);

  const [titre, setTitre] = useState("");
  const [societeId, setSocieteId] = useState<Id<"societes"> | "" | "__new">("");
  const [newSocieteNom, setNewSocieteNom] = useState("");
  const [montant, setMontant] = useState<string>("");
  const [stage, setStage] = useState<Doc<"deals">["stage"]>(defaultStage);
  const [probabilite, setProbabilite] = useState<string>(
    String(STAGES.find((s) => s.id === defaultStage)?.defaultProba ?? 10),
  );
  const [closingDate, setClosingDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const onStageChange = (next: Doc<"deals">["stage"]) => {
    setStage(next);
    const proba = STAGES.find((s) => s.id === next)?.defaultProba;
    if (proba !== undefined) setProbabilite(String(proba));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!titre.trim()) {
      toast.error("Le titre est obligatoire.");
      return;
    }
    if (societeId === "") {
      toast.error("Sélectionnez ou créez une société.");
      return;
    }
    if (societeId === "__new" && !newSocieteNom.trim()) {
      toast.error("Indiquez le nom de la nouvelle société.");
      return;
    }
    const montantNum = Number(montant);
    if (!Number.isFinite(montantNum) || montantNum < 0) {
      toast.error("Montant invalide.");
      return;
    }
    const probaNum = Number(probabilite);
    if (!Number.isFinite(probaNum) || probaNum < 0 || probaNum > 100) {
      toast.error("Probabilité entre 0 et 100.");
      return;
    }

    setSubmitting(true);
    try {
      let resolvedSocieteId: Id<"societes">;
      if (societeId === "__new") {
        resolvedSocieteId = await createSociete({
          nom: newSocieteNom.trim(),
          tags: [],
        });
      } else {
        resolvedSocieteId = societeId;
      }

      await createDeal({
        titre: titre.trim(),
        societe_id: resolvedSocieteId,
        contacts_ids: [],
        montant: montantNum,
        devise: "EUR",
        probabilite: probaNum,
        stage,
        date_closing_prevue: closingDate
          ? new Date(closingDate).getTime()
          : undefined,
        tags: [],
        notes_md: notes.trim() ? notes.trim() : undefined,
      });
      toast.success("Deal créé.");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Échec de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          autoFocus
          required
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="ACME — refonte du site"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="societe">Société *</Label>
        <Select
          value={societeId as string}
          onValueChange={(val) =>
            setSocieteId(val as Id<"societes"> | "" | "__new")
          }
          disabled={societes === undefined}
        >
          <SelectTrigger id="societe" className="w-full">
            <SelectValue
              placeholder={societes === undefined ? "Chargement…" : "— Choisir —"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {societes?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.nom}
                </SelectItem>
              ))}
              <SelectItem value="__new">+ Nouvelle société…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {societeId === "__new" ? (
          <Input
            placeholder="Nom de la société"
            value={newSocieteNom}
            onChange={(e) => setNewSocieteNom(e.target.value)}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="montant">Montant (€)</Label>
          <Input
            id="montant"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="probabilite">Probabilité (%)</Label>
          <Input
            id="probabilite"
            type="number"
            min={0}
            max={100}
            step={5}
            value={probabilite}
            onChange={(e) => setProbabilite(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage">Stage</Label>
          <Select
            value={stage}
            onValueChange={(val) => onStageChange(val as Doc<"deals">["stage"])}
          >
            <SelectTrigger id="stage" className="w-full">
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
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="closing">Date de closing</Label>
          <Input
            id="closing"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contexte, prochaines actions…"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Création…" : "Créer le deal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
