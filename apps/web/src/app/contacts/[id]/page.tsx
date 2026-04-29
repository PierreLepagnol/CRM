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
import { Authenticated, useMutation, useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, Download, Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LogReunionDialog } from "@/components/log-reunion-dialog";
import { TagPicker } from "@/components/tag-picker";
import { downloadHtmlPdf } from "@/lib/export";
import { formatDate, formatMontant } from "@/lib/format";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Contact">
      <Authenticated>
        <ContactDetail id={id as Id<"contacts">} />
      </Authenticated>
    </AppShell>
  );
}

function ContactDetail({ id }: { id: Id<"contacts"> }) {
  const contact = useQuery(api.contacts.get, { id });
  const societe = useQuery(
    api.societes.get,
    contact?.societe_id ? { id: contact.societe_id } : "skip",
  );
  const activity = useQuery(api.activity.listForEntity, {
    entity: { kind: "contact", id },
    limit: 20,
  });
  const deals = useQuery(api.deals.listByContact, { contact_id: id });
  const reunions = useQuery(api.reunions.listByEntity, { entity: { kind: "contact", id } });
  const update = useMutation(api.contacts.update);
  const remove = useMutation(api.contacts.remove);
  const router = useRouter();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [intitule, setIntitule] = useState("");
  const [civilite, setCivilite] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [telephones, setTelephones] = useState("");
  const [langue, setLangue] = useState("");
  const [anniversaire, setAnniversaire] = useState("");
  const [notes, setNotes] = useState("");
  const [niveau, setNiveau] = useState<"decideur" | "prescripteur" | "utilisateur" | "">("");

  useEffect(() => {
    if (!contact) return;
    setPrenom(contact.prenom);
    setNom(contact.nom);
    setIntitule(contact.intitule_poste ?? "");
    setCivilite(contact.civilite ?? "");
    setPhotoUrl(contact.photo_url ?? "");
    setEmail(contact.email ?? "");
    setLinkedin(contact.linkedin_url ?? "");
    setTelephones(contact.telephones.join(", "));
    setLangue(contact.langue ?? "fr");
    setAnniversaire(contact.anniversaire ?? "");
    setNotes(contact.notes_md ?? "");
    setNiveau((contact.niveau_decision as typeof niveau) ?? "");
  }, [contact?._id]);

  if (contact === undefined) return <DetailSkeleton />;
  if (contact === null)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Contact introuvable.
      </div>
    );

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try { await update({ id, patch }); }
    catch { toast.error("Échec de la mise à jour."); }
  };

  const onDelete = async () => {
    if (!confirm(`Supprimer "${contact.prenom} ${contact.nom}" ?`)) return;
    try {
      await remove({ id });
      toast.success("Contact supprimé.");
      router.push("/contacts");
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  const exportPdf = () => {
    downloadHtmlPdf(`contact-${contact._id}.html`, `${contact.prenom} ${contact.nom}`, [
      ["Société", societe?.nom ?? ""],
      ["Poste", intitule],
      ["Coordonnées", `${email}\n${telephones}\n${linkedin}`],
      ["Préférences", `Langue: ${langue}\nAnniversaire: ${anniversaire}`],
      ["Notes", notes],
    ]);
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    created: "Créé",
    updated: "Mis à jour",
    meeting_logged: "Réunion ajoutée",
    note_added: "Note ajoutée",
  };

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

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium">
            {contact.prenom[0]}{contact.nom[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{contact.prenom} {contact.nom}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {contact.intitule_poste && <span>{contact.intitule_poste}</span>}
              {societe && (
                <>
                  {contact.intitule_poste && <span>·</span>}
                  <Link href={`/societes/${contact.societe_id!}` as any} className="hover:underline">
                    {societe.nom}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf}>
          <Download data-icon="inline-start" />
          PDF
        </Button>
      </div>

      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Tags</h2>
        <TagPicker scope="contact" entity={{ kind: "contact", id }} value={contact.tags} />
      </section>

      {/* Coordonnées rapides */}
      <div className="mb-6 flex flex-wrap gap-3">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Mail className="size-3.5" /> {contact.email}
          </a>
        )}
        {contact.telephones.map((t) => (
          <a
            key={t}
            href={`tel:${t}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Phone className="size-3.5" /> {t}
          </a>
        ))}
        {contact.telephones[0] && (
          <a
            href={`sms:${contact.telephones[0]}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <MessageSquare className="size-3.5" /> SMS
          </a>
        )}
      </div>

      {/* Édition inline */}
      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-civilite">Civilité</Label>
            <Input
              id="c-civilite"
              value={civilite}
              onChange={(e) => setCivilite(e.target.value)}
              onBlur={() => persist({ civilite: civilite.trim() || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-photo">Photo URL</Label>
            <Input
              id="c-photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              onBlur={() => persist({ photo_url: photoUrl.trim() || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-prenom">Prénom</Label>
            <Input
              id="c-prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              onBlur={() => prenom.trim() && persist({ prenom: prenom.trim() })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-nom">Nom</Label>
            <Input
              id="c-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onBlur={() => nom.trim() && persist({ nom: nom.trim() })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-intitule">Intitulé de poste</Label>
            <Input
              id="c-intitule"
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
              onBlur={() => persist({ intitule_poste: intitule.trim() || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-niveau">Niveau de décision</Label>
            <Select
              value={niveau}
              onValueChange={(v) => {
                setNiveau(v as typeof niveau);
                persist({ niveau_decision: (v || undefined) as typeof contact.niveau_decision });
              }}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => persist({ email: email.trim() || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-telephones">Téléphones</Label>
            <Input
              id="c-telephones"
              value={telephones}
              onChange={(e) => setTelephones(e.target.value)}
              onBlur={() => persist({ telephones: telephones.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="+33 6..., +33 1..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-linkedin">LinkedIn</Label>
            <Input
              id="c-linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              onBlur={() => persist({ linkedin_url: linkedin.trim() || undefined })}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-langue">Langue</Label>
            <Input
              id="c-langue"
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              onBlur={() => persist({ langue: langue.trim() || undefined })}
              placeholder="fr"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-anniversaire">Anniversaire</Label>
            <Input
              id="c-anniversaire"
              type="date"
              value={anniversaire}
              onChange={(e) => setAnniversaire(e.target.value)}
              onBlur={() => persist({ anniversaire: anniversaire || undefined })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="c-notes">Notes</Label>
          <Textarea
            id="c-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persist({ notes_md: notes.trim() || undefined })}
            placeholder="Notes libres (markdown)"
          />
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-medium">Deals liés ({deals?.length ?? "…" })</h2>
        {deals === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun deal lié.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {deals.map((deal) => (
              <div key={deal._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{deal.titre}</span>
                <span>{formatMontant(deal.montant, deal.devise)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator className="my-6" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Réunions ({reunions?.length ?? "…" })</h2>
          <LogReunionDialog attachedTo={{ kind: "contact", id }} />
        </div>
        {reunions === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : reunions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune réunion liée.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {reunions.slice(0, 5).map((r) => (
              <div key={r._id} className="px-4 py-3 text-sm">
                <span className="font-medium">{formatDate(r.date)}</span>
                <span className="text-muted-foreground"> · {r.duree_minutes} min</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator className="my-6" />

      {/* Timeline */}
      <section>
        <h2 className="mb-3 text-sm font-medium">Activité</h2>
        {activity === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((a) => (
              <li key={a._id} className="flex gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {formatDate(a._creationTime)}
                </span>
                <span>{ACTIVITY_LABELS[a.kind] ?? a.kind}</span>
              </li>
            ))}
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
