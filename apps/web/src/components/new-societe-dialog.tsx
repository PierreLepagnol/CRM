"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
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
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  trigger?: React.ReactElement;
  onCreated?: (id: string) => void;
};

export function NewSocieteDialog({ trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Nouvelle société
            </Button>
          )
        }
      />
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle société</DialogTitle>
          </DialogHeader>
          <NewSocieteForm
            onSuccess={(id) => {
              setOpen(false);
              onCreated?.(id);
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function NewSocieteForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}) {
  const create = useMutation(api.societes.create);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [secteur, setSecteur] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { toast.error("Le nom est obligatoire."); return; }
    setSubmitting(true);
    try {
      const id = await create({
        nom: nom.trim(),
        ville: ville.trim() || undefined,
        secteur: secteur.trim() || undefined,
        site_web: siteWeb.trim() || undefined,
        tags: [],
      });
      toast.success("Société créée.");
      onSuccess(id);
    } catch {
      toast.error("Échec de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-nom">Nom *</Label>
        <Input id="s-nom" autoFocus required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ACME SAS" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-ville">Ville</Label>
          <Input id="s-ville" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Paris" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-secteur">Secteur</Label>
          <Input id="s-secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)} placeholder="Logiciel" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-site">Site web</Label>
        <Input id="s-site" type="url" value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://acme.fr" />
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
