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

import { SECTEURS, SECTEUR_ITEMS, secteurLabel, type SecteurEntreprise } from "@/lib/crm";

const NONE = "__none__";

export function NewEntrepriseDialog() {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [secteur, setSecteur] = useState<SecteurEntreprise | undefined>(undefined);
  const [siteWeb, setSiteWeb] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const create = useMutation(api.entreprises.create);

  const reset = () => {
    setNom("");
    setSecteur(undefined);
    setSiteWeb("");
    setNotes("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setLoading(true);
    try {
      await create({
        nom: nom.trim(),
        secteur,
        site_web: siteWeb.trim() || undefined,
        notes_md: notes.trim() || undefined,
      });
      toast.success("Entreprise créée.");
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
            Nouvelle entreprise
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl w-full flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b">
          <DialogTitle className="text-2xl">Nouvelle entreprise</DialogTitle>
          <DialogDescription>
            Renseignez les informations de l'entreprise.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ne-nom">Nom *</Label>
              <Input
                id="ne-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                autoFocus
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ne-secteur">Secteur</Label>
              <Select
                items={SECTEUR_ITEMS}
                value={secteur ?? NONE}
                onValueChange={(v) =>
                  setSecteur(v && v !== NONE ? (v as SecteurEntreprise) : undefined)
                }
              >
                <SelectTrigger id="ne-secteur" className="h-11 text-base">
                  <SelectValue>
                    {(v) => secteurLabel(v === NONE ? undefined : (v as SecteurEntreprise))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {SECTEURS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ne-site">Site web</Label>
              <Input
                id="ne-site"
                type="url"
                placeholder="https://…"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ne-notes">Notes</Label>
              <Textarea
                id="ne-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes libres…"
              />
            </div>
          </div>
          <DialogFooter className="px-8 py-5 border-t">
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="lg" disabled={loading || !nom.trim()}>
              {loading ? "Création…" : "Créer l'entreprise"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
