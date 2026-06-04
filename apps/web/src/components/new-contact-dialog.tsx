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
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { STAGES, STAGE_ITEMS, type ContactStage } from "@/lib/crm";
import { EntrepriseCombobox, type EntrepriseValue } from "./entreprise-combobox";
import {
  OwnerSelect,
  ResponsiblesMultiSelect,
  useAppUsers,
} from "./user-picker";

export function NewContactDialog({ defaultStage }: { defaultStage?: ContactStage }) {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState<EntrepriseValue>({ nom: "" });
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [poste, setPoste] = useState("");
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [montant, setMontant] = useState("0");
  const [stage, setStage] = useState<ContactStage>(defaultStage ?? "nouveau");
  const [loading, setLoading] = useState(false);

  const create = useMutation(api.contacts.create);
  const createEntreprise = useMutation(api.entreprises.create);
  const users = useAppUsers();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id as string | undefined;

  const reset = () => {
    setPrenom("");
    setNom("");
    setEntreprise({ nom: "" });
    setEmail("");
    setTelephone("");
    setPoste("");
    // Par défaut, le créateur est propriétaire (modifiable). Cf. CONTEXT.md.
    setOwnerId(currentUserId);
    setResponsibleIds([]);
    setMontant("0");
    setStage(defaultStage ?? "nouveau");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) return;
    setLoading(true);
    try {
      // Résout l'entreprise en entité réelle : si du texte a été tapé sans
      // sélection explicite, `create` (idempotent sur le nom normalisé) renvoie
      // l'entreprise existante ou en crée une. Cf. ADR 0001.
      const entrepriseNom = entreprise.nom.trim();
      const entrepriseId =
        entreprise.id ??
        (entrepriseNom ? await createEntreprise({ nom: entrepriseNom }) : undefined);
      await create({
        prenom: prenom.trim(),
        nom: nom.trim(),
        entreprise: entrepriseNom || undefined,
        entreprise_id: entrepriseId,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        poste: poste.trim() || undefined,
        owner_id: ownerId,
        responsible_ids: responsibleIds.length > 0 ? responsibleIds : undefined,
        montant: Number(montant) || 0,
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // À l'ouverture, pré-sélectionner le créateur comme propriétaire.
        if (o) setOwnerId((prev) => prev ?? currentUserId);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nouveau contact
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl w-full flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b">
          <DialogTitle className="text-2xl">Nouveau contact</DialogTitle>
          <DialogDescription>
            Renseignez les informations du contact à créer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-2 gap-6">
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
                <EntrepriseCombobox
                  id="nc-entreprise"
                  value={entreprise}
                  onChange={setEntreprise}
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
                <Label>Propriétaire</Label>
                <OwnerSelect users={users} value={ownerId} onChange={setOwnerId} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Responsables</Label>
                <ResponsiblesMultiSelect
                  users={users}
                  value={responsibleIds}
                  onChange={setResponsibleIds}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="nc-montant">Montant (€)</Label>
                <Input
                  id="nc-montant"
                  type="number"
                  min={0}
                  step={100}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="nc-stage">Stage</Label>
                <Select items={STAGE_ITEMS} value={stage} onValueChange={(v) => setStage(v as ContactStage)}>
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
