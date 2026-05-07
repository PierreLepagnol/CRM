"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Button } from "@CRM-APP/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { STATUTS, type ProjectStatut } from "@/lib/crm";

type ProjectType = "interne" | "mission";

export function NewProjectDialog({ defaultStatut }: { defaultStatut?: ProjectStatut }) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState<ProjectType>("interne");
  const [client, setClient] = useState("");
  const [montant, setMontant] = useState("0");
  const [statut, setStatut] = useState<ProjectStatut>(defaultStatut ?? "a_demarrer");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFinPrevue, setDateFinPrevue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const create = useMutation(api.projects.create);

  const reset = () => {
    setTitre("");
    setType("interne");
    setClient("");
    setMontant("0");
    setStatut(defaultStatut ?? "a_demarrer");
    setDateDebut("");
    setDateFinPrevue("");
    setDescription("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setLoading(true);
    try {
      await create({
        titre: titre.trim(),
        type,
        client: client.trim() || undefined,
        montant: Number(montant) || 0,
        statut,
        date_debut: dateDebut ? new Date(dateDebut).getTime() : undefined,
        date_fin_prevue: dateFinPrevue ? new Date(dateFinPrevue).getTime() : undefined,
        description_md: description.trim() || undefined,
      });
      toast.success("Projet créé.");
      reset();
      setOpen(false);
    } catch {
      toast.error("Échec de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nouveau projet
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>
            Renseignez les informations du projet à créer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-titre">Titre *</Label>
            <Input
              id="np-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger id="np-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="interne">Interne</SelectItem>
                    <SelectItem value="mission">Mission</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-statut">Statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as ProjectStatut)}>
                <SelectTrigger id="np-statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {type === "mission" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-client">Client</Label>
              <Input
                id="np-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nom du client"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-montant">Montant (€)</Label>
            <Input
              id="np-montant"
              type="number"
              min={0}
              step={100}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-date-debut">Début</Label>
              <Input
                id="np-date-debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-date-fin">Fin prévue</Label>
              <Input
                id="np-date-fin"
                type="date"
                value={dateFinPrevue}
                onChange={(e) => setDateFinPrevue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-desc">Description</Label>
            <Textarea
              id="np-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du projet…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !titre.trim()}>
              {loading ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
