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
import { ArrowLeft, Building2, Euro, Plus, Search, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { SECTEURS, SECTEUR_ITEMS, secteurLabel, type SecteurEntreprise } from "@/lib/crm";
import { formatEuros } from "@/lib/format";

const NONE = "__none__";

export default function EntrepriseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Entreprise" pageKey="entreprises">
      <Authenticated>
        <EntrepriseDetail id={id as Id<"entreprises">} />
      </Authenticated>
    </AppShell>
  );
}

function EntrepriseDetail({ id }: { id: Id<"entreprises"> }) {
  const entreprise = useQuery(api.entreprises.get, { id });
  const update = useMutation(api.entreprises.update);
  const remove = useMutation(api.entreprises.remove);
  const detach = useMutation(api.entreprises.detachContact);
  const router = useRouter();

  const [draftId, setDraftId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [secteur, setSecteur] = useState<SecteurEntreprise | undefined>(undefined);
  const [siteWeb, setSiteWeb] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (entreprise && entreprise._id !== draftId) {
    setDraftId(entreprise._id);
    setNom(entreprise.nom);
    setSecteur(entreprise.secteur);
    setSiteWeb(entreprise.site_web ?? "");
    setNotes(entreprise.notes_md ?? "");
  }

  if (entreprise === undefined) return <DetailSkeleton />;
  if (entreprise === null)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Entreprise introuvable.</div>
    );

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try {
      await update({ id, patch });
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  const onDelete = async () => {
    try {
      await remove({ id });
      toast.success("Entreprise supprimée.");
      router.push("/entreprises");
    } catch {
      toast.error(
        "Impossible de supprimer : des contacts y sont rattachés. Détachez-les ou fusionnez d'abord.",
      );
      setConfirmDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/entreprises"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Entreprises
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{entreprise.nom}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{entreprise.nom}</h1>
            <div className="text-sm text-muted-foreground">{secteurLabel(entreprise.secteur)}</div>
          </div>
        </div>
        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size="sm"
          onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
          onBlur={() => setConfirmDelete(false)}
          className={confirmDelete ? "" : "text-destructive hover:text-destructive"}
        >
          {confirmDelete ? "Confirmer ?" : <Trash2 className="size-4" />}
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
          <Users className="size-3.5" /> {entreprise.contactCount} contact
          {entreprise.contactCount > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
          <Euro className="size-3.5" /> {formatEuros(entreprise.montantTotal)}
        </span>
      </div>

      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ed-nom">Nom</Label>
            <Input
              id="ed-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onBlur={() => nom.trim() && nom.trim() !== entreprise.nom && persist({ nom: nom.trim() })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ed-secteur">Secteur</Label>
            <Select
              items={SECTEUR_ITEMS}
              value={secteur ?? NONE}
              onValueChange={(v) => {
                const next = v && v !== NONE ? (v as SecteurEntreprise) : undefined;
                setSecteur(next);
                // null efface le secteur côté serveur (cf. entreprises.update).
                void persist({ secteur: next ?? null });
              }}
            >
              <SelectTrigger id="ed-secteur" className="w-full">
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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ed-site">Site web</Label>
            <Input
              id="ed-site"
              type="url"
              placeholder="https://…"
              value={siteWeb}
              onChange={(e) => setSiteWeb(e.target.value)}
              onBlur={() => persist({ site_web: siteWeb.trim() })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="ed-notes">Notes</Label>
          <Textarea
            id="ed-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persist({ notes_md: notes.trim() })}
            placeholder="Notes libres…"
          />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium">Contacts rattachés ({entreprise.contactCount})</h2>
        </div>
        <AttachContact entrepriseId={id} attachedIds={entreprise.contacts.map((c) => c._id)} />
        {entreprise.contacts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun contact rattaché.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y rounded-lg border">
            {entreprise.contacts.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <Link href={`/contacts/${c._id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="font-medium">{c.prenom} {c.nom}</span>
                  {c.poste && <span className="text-muted-foreground"> · {c.poste}</span>}
                </Link>
                <span className="text-sm text-muted-foreground">{formatEuros(c.montant ?? 0)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                  title="Détacher"
                  onClick={async () => {
                    try {
                      await detach({ contact_id: c._id });
                      toast.success("Contact détaché.");
                    } catch {
                      toast.error("Échec.");
                    }
                  }}
                >
                  <X className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator className="my-6" />

      <MergeEntreprise absorbedId={id} absorbedNom={entreprise.nom} />
    </div>
  );
}

/** Recherche un contact existant et le rattache à l'entreprise. */
function AttachContact({
  entrepriseId,
  attachedIds,
}: {
  entrepriseId: Id<"entreprises">;
  attachedIds: Id<"contacts">[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useQuery(api.contacts.search, open && q.trim() ? { q: q.trim() } : "skip") ?? [];
  const attach = useMutation(api.entreprises.attachContact);

  const candidates = results.filter((c) => !attachedIds.includes(c._id));

  const onAttach = async (contactId: Id<"contacts">) => {
    try {
      await attach({ contact_id: contactId, entreprise_id: entrepriseId });
      toast.success("Contact rattaché.");
      setQ("");
      setOpen(false);
    } catch {
      toast.error("Échec du rattachement.");
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rattacher un contact existant…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && q.trim() && (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {candidates.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">Aucun contact disponible.</li>
          ) : (
            candidates.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => onAttach(c._id)}
                >
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                  {c.prenom} {c.nom}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Fusionne CETTE entreprise (absorbée) dans une autre (survivante). */
function MergeEntreprise({
  absorbedId,
  absorbedNom,
}: {
  absorbedId: Id<"entreprises">;
  absorbedNom: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useQuery(api.entreprises.searchByPrefix, open && q.trim() ? { q: q.trim() } : "skip") ?? [];
  const merge = useMutation(api.entreprises.merge);
  const router = useRouter();

  const candidates = results.filter((e) => e._id !== absorbedId);

  const onMerge = async (survivorId: Id<"entreprises">, survivorNom: string) => {
    try {
      const res = await merge({ survivorId, absorbedId });
      toast.success(`« ${absorbedNom} » fusionnée dans « ${survivorNom} » (${res.moved} contact(s) déplacé(s)).`);
      router.push(`/entreprises/${survivorId}`);
    } catch {
      toast.error("Échec de la fusion.");
    }
  };

  return (
    <section className="rounded-lg border border-dashed p-4">
      <h2 className="mb-1 text-sm font-medium">Fusionner</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Fusionne « {absorbedNom} » dans une autre entreprise (survivante) : ses contacts y sont
        rattachés et cette fiche est supprimée.
      </p>
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Entreprise survivante…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        {open && q.trim() && (
          <ul
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            {candidates.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">Aucune autre entreprise.</li>
            ) : (
              candidates.map((e) => (
                <li key={e._id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => onMerge(e._id, e.nom)}
                  >
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    {e.nom}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </section>
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
