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
import { Separator } from "@CRM-APP/ui/components/separator";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Bell, BellOff, Euro, Mail, Phone, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
  OwnerSelect,
  ResponsiblesMultiSelect,
  useAppUsers,
} from "@/components/user-picker";
import {
  STAGES,
  INTERACTION_TYPES,
  type ContactStage,
  type InteractionType,
  interactionLabel,
  interactionIcon,
} from "@/lib/crm";
import { formatDate, formatEuros } from "@/lib/format";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Contact" pageKey="contacts">
      <Authenticated>
        <ContactDetail id={id as Id<"contacts">} />
      </Authenticated>
    </AppShell>
  );
}

function ContactDetail({ id }: { id: Id<"contacts"> }) {
  const contact = useQuery(api.contacts.get, { id });
  const interactions = useQuery(api.interactions.listByContact, { contact_id: id });
  const update = useMutation(api.contacts.update);
  const remove = useMutation(api.contacts.remove);
  const createInteraction = useMutation(api.interactions.create);
  const deleteInteraction = useMutation(api.interactions.remove);
  const router = useRouter();

  const [draftContactId, setDraftContactId] = useState<Id<"contacts"> | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [poste, setPoste] = useState("");
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [montant, setMontant] = useState("0");
  const users = useAppUsers();
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<ContactStage>("nouveau");
  const [relanceDate, setRelanceDate] = useState("");

  const [interType, setInterType] = useState<InteractionType>("email");
  const [interDate, setInterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [interResume, setInterResume] = useState("");
  const [interLoading, setInterLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (contact && contact._id !== draftContactId) {
    setDraftContactId(contact._id);
    setPrenom(contact.prenom);
    setNom(contact.nom);
    setEntreprise(contact.entreprise ?? "");
    setEmail(contact.email ?? "");
    setTelephone(contact.telephone ?? "");
    setPoste(contact.poste ?? "");
    setOwnerId(contact.owner_id ?? undefined);
    setResponsibleIds(contact.responsible_ids ?? []);
    setMontant(String(contact.montant ?? 0));
    setNotes(contact.notes_md ?? "");
    setStage(contact.stage);
    setRelanceDate(
      contact.next_relance_at ? new Date(contact.next_relance_at).toISOString().slice(0, 10) : "",
    );
  }

  if (contact === undefined) return <DetailSkeleton />;
  if (contact === null)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Contact introuvable.</div>
    );

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try { await update({ id, patch }); }
    catch { toast.error("Échec de la mise à jour."); }
  };

  const onDelete = async () => {
    try {
      await remove({ id });
      toast.success("Contact supprimé.");
      router.push("/contacts");
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  const onRelanceChange = async (dateStr: string) => {
    setRelanceDate(dateStr);
    const ts = dateStr ? new Date(dateStr).getTime() : null;
    await persist({ next_relance_at: ts });
    if (ts) {
      try {
        await createInteraction({
          contact_id: id,
          type: "relance",
          date_at: ts,
          resume: `Relance programmée pour le ${new Date(ts).toLocaleDateString("fr-FR")}`,
        });
      } catch {
        // non-blocking
      }
    }
  };

  const onAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interResume.trim()) return;
    setInterLoading(true);
    try {
      await createInteraction({
        contact_id: id,
        type: interType,
        date_at: new Date(interDate).getTime(),
        resume: interResume.trim(),
      });
      setInterResume("");
      toast.success("Échange ajouté.");
    } catch {
      toast.error("Échec de l'ajout.");
    } finally {
      setInterLoading(false);
    }
  };

  const now = Date.now();
  const relanceTs = contact.next_relance_at;
  const relanceOverdue = relanceTs !== undefined && relanceTs < now;
  const relanceToday =
    relanceTs !== undefined &&
    relanceTs <= new Date(new Date().setHours(23, 59, 59, 999)).getTime() &&
    !relanceOverdue;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Contacts
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{contact.prenom} {contact.nom}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold">
            {contact.prenom[0]}{contact.nom[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{contact.prenom} {contact.nom}</h1>
            <div className="text-sm text-muted-foreground">
              {contact.poste && <span>{contact.poste}</span>}
              {contact.poste && contact.entreprise && <span> · </span>}
              {contact.entreprise && <span>{contact.entreprise}</span>}
            </div>
          </div>
        </div>
        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size="sm"
          onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
          onBlur={() => setConfirmDelete(false)}
          className={cn(!confirmDelete && "text-destructive hover:text-destructive")}
        >
          {confirmDelete ? "Confirmer ?" : <Trash2 className="size-4" />}
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Mail className="size-3.5" /> {contact.email}
          </a>
        )}
        {contact.telephone && (
          <a
            href={`tel:${contact.telephone}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Phone className="size-3.5" /> {contact.telephone}
          </a>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
          <Euro className="size-3.5" /> {formatEuros(contact.montant ?? 0)}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <Label htmlFor="cd-stage" className="mb-3 block text-sm font-medium">Stage pipeline</Label>
          <Select value={stage} onValueChange={(v) => { setStage(v as ContactStage); persist({ stage: v as ContactStage }); }}>
            <SelectTrigger id="cd-stage" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Relance</h2>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-relance-date">Date de relance</Label>
            <Input
              id="cd-relance-date"
              type="date"
              value={relanceDate}
              onChange={(e) => setRelanceDate(e.target.value)}
              onBlur={() => onRelanceChange(relanceDate)}
              className={cn(
                relanceOverdue && "border-rose-500",
                relanceToday && "border-orange-400",
              )}
            />
            {relanceTs && (
              <p className={cn(
                "text-xs",
                relanceOverdue && "text-rose-600",
                relanceToday && "text-orange-600",
                !relanceOverdue && !relanceToday && "text-muted-foreground",
              )}>
                {relanceOverdue
                  ? "En retard !"
                  : relanceToday
                  ? "Aujourd'hui"
                  : `Dans ${Math.ceil((relanceTs - now) / 86400000)} j`}
              </p>
            )}
          </div>
          {relanceTs ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setRelanceDate(""); persist({ next_relance_at: null }); }}
            >
              <BellOff className="size-4" />
              Effacer
            </Button>
          ) : (
            <Bell className="size-4 text-muted-foreground" />
          )}
        </div>
        </section>
      </div>

      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-prenom">Prénom</Label>
            <Input id="cd-prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} onBlur={() => prenom.trim() && persist({ prenom: prenom.trim() })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-nom">Nom</Label>
            <Input id="cd-nom" value={nom} onChange={(e) => setNom(e.target.value)} onBlur={() => nom.trim() && persist({ nom: nom.trim() })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-entreprise">Entreprise</Label>
            <Input id="cd-entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} onBlur={() => persist({ entreprise: entreprise.trim() || undefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-poste">Poste</Label>
            <Input id="cd-poste" value={poste} onChange={(e) => setPoste(e.target.value)} onBlur={() => persist({ poste: poste.trim() || undefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-email">Email</Label>
            <Input id="cd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => persist({ email: email.trim() || undefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-tel">Téléphone</Label>
            <Input id="cd-tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} onBlur={() => persist({ telephone: telephone.trim() || undefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Propriétaire</Label>
            <OwnerSelect
              users={users}
              value={ownerId}
              onChange={(v) => {
                setOwnerId(v);
                // null efface explicitement le propriétaire (undefined serait ignoré).
                void persist({ owner_id: v ?? null });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Responsables</Label>
            <ResponsiblesMultiSelect
              users={users}
              value={responsibleIds}
              onChange={(ids) => {
                setResponsibleIds(ids);
                void persist({ responsible_ids: ids });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="cd-montant">Montant (€)</Label>
            <Input
              id="cd-montant"
              type="number"
              min={0}
              step={100}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              onBlur={() => persist({ montant: Number(montant) || 0 })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="cd-notes">Notes</Label>
          <Textarea
            id="cd-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persist({ notes_md: notes.trim() || undefined })}
            placeholder="Notes libres…"
          />
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-4 text-sm font-medium">
          Historique des échanges ({interactions?.length ?? "…"})
        </h2>

        <form onSubmit={onAddInteraction} className="mb-4 rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inter-type">Type</Label>
              <Select value={interType} onValueChange={(v) => setInterType(v as InteractionType)}>
                <SelectTrigger id="inter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inter-date">Date</Label>
              <Input
                id="inter-date"
                type="date"
                value={interDate}
                onChange={(e) => setInterDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-3 flex flex-col gap-1.5">
            <Label htmlFor="inter-resume">Résumé</Label>
            <Textarea
              id="inter-resume"
              rows={2}
              value={interResume}
              onChange={(e) => setInterResume(e.target.value)}
              placeholder="Résumé de l'échange…"
            />
          </div>
          <Button type="submit" size="sm" disabled={interLoading || !interResume.trim()}>
            <Plus className="size-4" />
            {interLoading ? "Ajout…" : "Ajouter"}
          </Button>
        </form>

        {interactions === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun échange enregistré.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {interactions.map((inter) => {
              const TypeIcon = interactionIcon(inter.type);
              return (
                <li key={inter._id} className="flex items-start gap-3 px-4 py-3">
                  <TypeIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {interactionLabel(inter.type)} · {formatDate(inter.date_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try { await deleteInteraction({ id: inter._id }); }
                          catch { toast.error("Échec."); }
                        }}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                    <p className="mt-0.5 text-sm">{inter.resume}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
