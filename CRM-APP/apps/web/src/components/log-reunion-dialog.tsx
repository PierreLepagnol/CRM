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
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AttachedTo =
  | { kind: "deal"; id: Id<"deals"> }
  | { kind: "societe"; id: Id<"societes"> }
  | { kind: "contact"; id: Id<"contacts"> };

type Props = {
  attachedTo?: AttachedTo;
  trigger?: React.ReactElement;
  onCreated?: () => void;
};

type NextStep = { description: string; due_date?: number; owner_id?: string; done: boolean };

export function LogReunionDialog({ attachedTo, trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="xs" variant="outline">
              <Plus data-icon="inline-start" /> Logger
            </Button>
          )
        }
      />
      {open && (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Logger une réunion</DialogTitle>
          </DialogHeader>
          <LogReunionForm
            attachedTo={attachedTo}
            onSuccess={() => { setOpen(false); onCreated?.(); }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function LogReunionForm({
  attachedTo,
  onSuccess,
  onCancel,
}: {
  attachedTo?: AttachedTo;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const contacts = useQuery(api.contacts.listForPicker, {});
  const societes = useQuery(api.societes.listForPicker, {});
  const deals = useQuery(api.deals.listForKanban, {});
  const create = useMutation(api.reunions.create);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState("09:00");
  const [duree, setDuree] = useState("60");
  const [lieu, setLieu] = useState("");
  const [compteRendu, setCompteRendu] = useState("");
  const [participants, setParticipants] = useState<Id<"contacts">[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [targetKind, setTargetKind] = useState<AttachedTo["kind"]>(attachedTo?.kind ?? "deal");
  const [targetId, setTargetId] = useState<string>(attachedTo?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const toggleParticipant = (id: Id<"contacts">) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const addNextStep = () => {
    setNextSteps((prev) => [...prev, { description: "", done: false }]);
  };

  const updateNextStep = (i: number, patch: Partial<NextStep>) => {
    setNextSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const removeNextStep = (i: number) => {
    setNextSteps((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dureeNum = Number(duree);
    if (!Number.isFinite(dureeNum) || dureeNum <= 0) {
      toast.error("Durée invalide.");
      return;
    }
    const dateTs = new Date(`${date}T${time}`).getTime();
    if (!Number.isFinite(dateTs)) {
      toast.error("Date invalide.");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedAttachedTo =
        attachedTo ??
        (targetKind === "societe"
          ? { kind: "societe" as const, id: targetId as Id<"societes"> }
          : targetKind === "contact"
            ? { kind: "contact" as const, id: targetId as Id<"contacts"> }
            : { kind: "deal" as const, id: targetId as Id<"deals"> });
      if (!resolvedAttachedTo.id) {
        toast.error("Sélectionnez une fiche à rattacher.");
        setSubmitting(false);
        return;
      }
      await create({
        attached_to: resolvedAttachedTo,
        date: dateTs,
        duree_minutes: dureeNum,
        lieu_ou_url: lieu.trim() || undefined,
        participants_ids: participants,
        compte_rendu_md: compteRendu.trim() || undefined,
        next_steps: nextSteps.filter((s) => s.description.trim()),
      });
      toast.success("Réunion enregistrée.");

      // Generate .ics download
      downloadIcs({ date: dateTs, duree: dureeNum, lieu: lieu.trim() });

      onSuccess();
    } catch {
      toast.error("Échec de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
      {!attachedTo && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Liée à</Label>
            <Select value={targetKind} onValueChange={(value) => { setTargetKind(value as AttachedTo["kind"]); setTargetId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="deal">Deal</SelectItem>
                  <SelectItem value="societe">Société</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fiche</Label>
            <Select value={targetId} onValueChange={(value) => setTargetId(value ?? "")}>
              <SelectTrigger><SelectValue placeholder="— Choisir —" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {targetKind === "societe" &&
                    societes?.map((s) => <SelectItem key={s._id} value={s._id}>{s.nom}</SelectItem>)}
                  {targetKind === "contact" &&
                    contacts?.map((c) => <SelectItem key={c._id} value={c._id}>{c.prenom} {c.nom}</SelectItem>)}
                  {targetKind === "deal" &&
                    deals?.map((d) => <SelectItem key={d._id} value={d._id}>{d.titre}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-date">Date</Label>
          <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-time">Heure</Label>
          <Input id="r-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-duree">Durée (min)</Label>
          <Input
            id="r-duree"
            type="number"
            min={5}
            step={5}
            value={duree}
            onChange={(e) => setDuree(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-lieu">Lieu / URL</Label>
          <Input
            id="r-lieu"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            placeholder="Teams, bureau…"
          />
        </div>
      </div>

      {/* Participants */}
      {contacts && contacts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Participants</Label>
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
            {contacts.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleParticipant(c._id)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  participants.includes(c._id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {c.prenom} {c.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-cr">Compte-rendu</Label>
        <Textarea
          id="r-cr"
          rows={4}
          value={compteRendu}
          onChange={(e) => setCompteRendu(e.target.value)}
          placeholder="Points abordés, décisions… (markdown supporté)"
        />
      </div>

      {/* Next steps */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Next steps</Label>
          <button
            type="button"
            onClick={addNextStep}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Ajouter
          </button>
        </div>
        {nextSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={step.description}
              onChange={(e) => updateNextStep(i, { description: e.target.value })}
              placeholder="Description de l'action"
              className="flex-1"
            />
            <Input
              type="date"
              value={step.due_date ? new Date(step.due_date).toISOString().slice(0, 10) : ""}
              onChange={(e) =>
                updateNextStep(i, {
                  due_date: e.target.value ? new Date(e.target.value).getTime() : undefined,
                })
              }
              className="w-36"
            />
            <button
              type="button"
              onClick={() => removeNextStep(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer + .ics"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function downloadIcs({
  date,
  duree,
  lieu,
}: {
  date: number;
  duree: number;
  lieu?: string;
}) {
  const start = new Date(date);
  const end = new Date(date + duree * 60_000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM//FR",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Réunion`,
    lieu ? `LOCATION:${lieu}` : "",
    `UID:${Date.now()}@crm`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reunion.ics";
  a.click();
  URL.revokeObjectURL(url);
}
