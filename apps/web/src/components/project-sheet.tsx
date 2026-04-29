"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@CRM-APP/ui/components/sheet";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { STATUTS, type ProjectStatut } from "@/lib/crm";

export function ProjectSheet({
  projectId,
  onClose,
}: {
  projectId: Id<"projects"> | null;
  onClose: () => void;
}) {
  const project = useQuery(api.projects.get, projectId ? { id: projectId } : "skip");
  const update = useMutation(api.projects.update);
  const remove = useMutation(api.projects.remove);

  const [draftProjectId, setDraftProjectId] = useState<Id<"projects"> | null>(null);
  const [titre, setTitre] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState<ProjectStatut>("a_demarrer");
  const [type, setType] = useState<"interne" | "mission">("interne");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFinPrevue, setDateFinPrevue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (project && project._id !== draftProjectId) {
    setDraftProjectId(project._id);
    setTitre(project.titre);
    setClient(project.client ?? "");
    setDescription(project.description_md ?? "");
    setStatut(project.statut);
    setType(project.type);
    setDateDebut(project.date_debut ? new Date(project.date_debut).toISOString().slice(0, 10) : "");
    setDateFinPrevue(
      project.date_fin_prevue ? new Date(project.date_fin_prevue).toISOString().slice(0, 10) : "",
    );
    setConfirmDelete(false);
  }

  if (!projectId) return null;

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try { await update({ id: projectId, patch }); }
    catch { toast.error("Échec de la mise à jour."); }
  };

  const onDelete = async () => {
    try {
      await remove({ id: projectId });
      toast.success("Projet supprimé.");
      onClose();
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  return (
    <Sheet open={!!projectId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="flex flex-col gap-4 overflow-auto">
        <SheetHeader>
          <SheetTitle>Projet</SheetTitle>
        </SheetHeader>

        {!project ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ps-titre">Titre</Label>
              <Input
                id="ps-titre"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onBlur={() => titre.trim() && persist({ titre: titre.trim() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ps-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v as "interne" | "mission");
                    persist({ type: v as "interne" | "mission" });
                  }}
                >
                  <SelectTrigger id="ps-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="interne">Interne</SelectItem>
                      <SelectItem value="mission">Mission</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ps-statut">Statut</Label>
                <Select
                  value={statut}
                  onValueChange={(v) => {
                    setStatut(v as ProjectStatut);
                    persist({ statut: v as ProjectStatut });
                  }}
                >
                  <SelectTrigger id="ps-statut"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUTS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {type === "mission" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ps-client">Client</Label>
                <Input
                  id="ps-client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  onBlur={() => persist({ client: client.trim() || undefined })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ps-date-debut">Début</Label>
                <Input
                  id="ps-date-debut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  onBlur={() =>
                    persist({ date_debut: dateDebut ? new Date(dateDebut).getTime() : undefined })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ps-date-fin">Fin prévue</Label>
                <Input
                  id="ps-date-fin"
                  type="date"
                  value={dateFinPrevue}
                  onChange={(e) => setDateFinPrevue(e.target.value)}
                  onBlur={() =>
                    persist({
                      date_fin_prevue: dateFinPrevue
                        ? new Date(dateFinPrevue).getTime()
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ps-desc">Description</Label>
              <Textarea
                id="ps-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => persist({ description_md: description.trim() || undefined })}
              />
            </div>
            <Button
              variant={confirmDelete ? "destructive" : "ghost"}
              size="sm"
              onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              className={
                confirmDelete
                  ? "mt-2 self-start"
                  : "mt-2 self-start text-destructive hover:text-destructive"
              }
            >
              {confirmDelete ? (
                "Confirmer ?"
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Supprimer
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
