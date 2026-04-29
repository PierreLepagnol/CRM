"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
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
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  defaultSocieteId?: Id<"societes">;
  trigger?: React.ReactElement;
  onCreated?: (id: string) => void;
};

export function NewContactDialog({ defaultSocieteId, trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" variant="outline">
              <Plus data-icon="inline-start" />
              Contact
            </Button>
          )
        }
      />
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau contact</DialogTitle>
          </DialogHeader>
          <NewContactForm
            defaultSocieteId={defaultSocieteId}
            onSuccess={(id) => { setOpen(false); onCreated?.(id); }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function NewContactForm({
  defaultSocieteId,
  onSuccess,
  onCancel,
}: {
  defaultSocieteId?: Id<"societes">;
  onSuccess: (id: string) => void;
  onCancel: () => void;
}) {
  const societes = useQuery(api.societes.listForPicker);
  const create = useMutation(api.contacts.create);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [societeId, setSocieteId] = useState<Id<"societes"> | "">(defaultSocieteId ?? "");
  const [intitule, setIntitule] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [niveauDecision, setNiveauDecision] = useState<"decideur" | "prescripteur" | "utilisateur" | "">("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) { toast.error("Prénom et nom obligatoires."); return; }
    setSubmitting(true);
    try {
      const id = await create({
        prenom: prenom.trim(),
        nom: nom.trim(),
        societe_id: societeId || undefined,
        intitule_poste: intitule.trim() || undefined,
        email: email.trim() || undefined,
        telephones: telephone.trim() ? [telephone.trim()] : [],
        niveau_decision: niveauDecision || undefined,
        tags: [],
      });
      toast.success("Contact créé.");
      onSuccess(id);
    } catch {
      toast.error("Échec de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-prenom">Prénom *</Label>
          <Input id="c-prenom" autoFocus required value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-nom">Nom *</Label>
          <Input id="c-nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-societe">Société</Label>
        <Select
          value={societeId as string}
          onValueChange={(v) => setSocieteId(v as Id<"societes"> | "")}
          disabled={societes === undefined}
        >
          <SelectTrigger id="c-societe" className="w-full">
            <SelectValue placeholder={societes === undefined ? "Chargement…" : "— Aucune —"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">— Aucune —</SelectItem>
              {societes?.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.nom}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-poste">Intitulé de poste</Label>
          <Input id="c-poste" value={intitule} onChange={(e) => setIntitule(e.target.value)} placeholder="Directeur SI" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-niveau">Niveau de décision</Label>
          <Select
            value={niveauDecision}
            onValueChange={(v) => setNiveauDecision(v as typeof niveauDecision)}
          >
            <SelectTrigger id="c-niveau" className="w-full">
              <SelectValue placeholder="— Aucun —" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">— Aucun —</SelectItem>
                <SelectItem value="decideur">Décideur</SelectItem>
                <SelectItem value="prescripteur">Prescripteur</SelectItem>
                <SelectItem value="utilisateur">Utilisateur</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-tel">Téléphone</Label>
          <Input id="c-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Création…" : "Créer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
