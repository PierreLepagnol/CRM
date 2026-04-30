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
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { STAGES, type ContactStage } from "@/lib/crm";

export function NewContactDialog({ defaultStage }: { defaultStage?: ContactStage }) {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [poste, setPoste] = useState("");
  const [contactSciam, setContactSciam] = useState("");
  const [stage, setStage] = useState<ContactStage>(defaultStage ?? "nouveau");
  const [loading, setLoading] = useState(false);

  const create = useMutation(api.contacts.create);

  const reset = () => {
    setPrenom("");
    setNom("");
    setEntreprise("");
    setEmail("");
    setTelephone("");
    setPoste("");
    setContactSciam("");
    setStage(defaultStage ?? "nouveau");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) return;
    setLoading(true);
    try {
      await create({
        prenom: prenom.trim(),
        nom: nom.trim(),
        entreprise: entreprise.trim() || undefined,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        poste: poste.trim() || undefined,
        contact_sciam: contactSciam.trim() || undefined,
        stage,
      });
      toast.success("Contact créé.");
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
            Nouveau contact
          </Button>
        }
      />
      <DialogContent className="max-w-full h-screen rounded-none flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b">
          <DialogTitle className="text-2xl">Nouveau contact</DialogTitle>
          <DialogDescription>
            Renseignez les informations du contact à créer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-3xl mx-auto grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-prenom">Prénom *</Label>
                <Input
                  id="nc-prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  autoFocus
                  className="h-11 text-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-nom">Nom *</Label>
                <Input
                  id="nc-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="nc-entreprise">Entreprise</Label>
                <Input
                  id="nc-entreprise"
                  value={entreprise}
                  onChange={(e) => setEntreprise(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-email">Email</Label>
                <Input
                  id="nc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-tel">Téléphone</Label>
                <Input
                  id="nc-tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-poste">Poste</Label>
                <Input
                  id="nc-poste"
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nc-sciam">Contact SCIAM référent</Label>
                <Input
                  id="nc-sciam"
                  value={contactSciam}
                  onChange={(e) => setContactSciam(e.target.value)}
                  placeholder="Ex: Sophie Martin"
                  className="h-11 text-base"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="nc-stage">Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as ContactStage)}>
                  <SelectTrigger id="nc-stage" className="h-11 text-base">
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
            </div>
          </div>
          <DialogFooter className="px-8 py-5 border-t">
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="lg" disabled={loading || !prenom.trim() || !nom.trim()}>
              {loading ? "Création…" : "Créer le contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
