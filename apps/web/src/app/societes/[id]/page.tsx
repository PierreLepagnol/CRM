"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Button } from "@CRM-APP/ui/components/button";
import { Input } from "@CRM-APP/ui/components/input";
import { Label } from "@CRM-APP/ui/components/label";
import { Separator } from "@CRM-APP/ui/components/separator";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Textarea } from "@CRM-APP/ui/components/textarea";
import { Authenticated, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { NewContactDialog } from "@/components/new-contact-dialog";
import { NewDealDialog } from "@/components/new-deal-dialog";
import { LogReunionDialog } from "@/components/log-reunion-dialog";
import { TagPicker } from "@/components/tag-picker";
import { downloadHtmlPdf } from "@/lib/export";
import { formatDate, formatMontant } from "@/lib/format";

export default function SocieteDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Société">
      <Authenticated>
        <SocieteDetail id={id as Id<"societes">} />
      </Authenticated>
    </AppShell>
  );
}

function SocieteDetail({ id }: { id: Id<"societes"> }) {
  const societe = useQuery(api.societes.get, { id });
  const contacts = useQuery(api.contacts.listBySociete, { societe_id: id });
  const deals = useQuery(api.deals.listBySociete, { societe_id: id });
  const contrats = useQuery(api.contrats.listBySociete, { societe_id: id });
  const reunions = useQuery(api.reunions.listByEntity, { entity: { kind: "societe", id } });
  const activity = useQuery(api.activity.listForEntity, {
    entity: { kind: "societe", id },
    limit: 20,
  });
  const update = useMutation(api.societes.update);
  const remove = useMutation(api.societes.remove);
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [secteur, setSecteur] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [siret, setSiret] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [pays, setPays] = useState("");
  const [effectif, setEffectif] = useState("");
  const [caEstime, setCaEstime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!societe) return;
    setNom(societe.nom);
    setVille(societe.ville ?? "");
    setSecteur(societe.secteur ?? "");
    setSiteWeb(societe.site_web ?? "");
    setSiret(societe.siret ?? "");
    setFormeJuridique(societe.forme_juridique ?? "");
    setAdresse(societe.adresse ?? "");
    setCodePostal(societe.code_postal ?? "");
    setPays(societe.pays ?? "");
    setEffectif(societe.effectif != null ? String(societe.effectif) : "");
    setCaEstime(societe.ca_estime != null ? String(societe.ca_estime) : "");
    setNotes(societe.notes_md ?? "");
  }, [societe?._id]);

  if (societe === undefined) return <DetailSkeleton />;
  if (societe === null)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Société introuvable.
      </div>
    );

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try {
      await update({ id, patch });
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  const onDelete = async () => {
    if (!confirm(`Supprimer "${societe.nom}" ?`)) return;
    try {
      await remove({ id });
      toast.success("Société supprimée.");
      router.push("/societes");
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  const exportPdf = () => {
    downloadHtmlPdf(`societe-${societe._id}.html`, societe.nom, [
      ["Identité", `${societe.nom}\n${siret}\n${formeJuridique}`],
      ["Adresse", `${adresse}\n${codePostal} ${ville}\n${pays}`],
      ["Activité", `${secteur}\nEffectif: ${effectif}\nCA estimé: ${caEstime}`],
      ["Notes", notes],
    ]);
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    created: "Créée",
    updated: "Mise à jour",
    meeting_logged: "Réunion ajoutée",
    note_added: "Note ajoutée",
    merged: "Fusionnée",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/societes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Sociétés
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{societe.nom}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{societe.nom}</h1>
            {societe.ville && (
              <p className="text-sm text-muted-foreground">{societe.ville}</p>
            )}
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
        <TagPicker scope="societe" entity={{ kind: "societe", id }} value={societe.tags} />
      </section>

      {/* Édition inline */}
      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onBlur={() => nom.trim() && nom !== societe.nom && persist({ nom: nom.trim() })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              onBlur={() => persist({ siret: siret.trim() || undefined })}
              placeholder="123 456 789 00012"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forme">Forme juridique</Label>
            <Input
              id="forme"
              value={formeJuridique}
              onChange={(e) => setFormeJuridique(e.target.value)}
              onBlur={() => persist({ forme_juridique: formeJuridique.trim() || undefined })}
              placeholder="SAS"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              onBlur={() => persist({ adresse: adresse.trim() || undefined })}
              placeholder="12 rue de la Paix"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              onBlur={() => persist({ ville: ville.trim() || undefined })}
              placeholder="Paris"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code-postal">Code postal</Label>
            <Input
              id="code-postal"
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              onBlur={() => persist({ code_postal: codePostal.trim() || undefined })}
              placeholder="75002"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pays">Pays</Label>
            <Input
              id="pays"
              value={pays}
              onChange={(e) => setPays(e.target.value)}
              onBlur={() => persist({ pays: pays.trim() || undefined })}
              placeholder="France"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="secteur">Secteur</Label>
            <Input
              id="secteur"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              onBlur={() => persist({ secteur: secteur.trim() || undefined })}
              placeholder="Logiciel"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site">Site web</Label>
            <div className="flex items-center gap-2">
              <Input
                id="site"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                onBlur={() => persist({ site_web: siteWeb.trim() || undefined })}
                placeholder="https://acme.fr"
              />
              {societe.site_web && (
                <a
                  href={societe.site_web}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="effectif">Effectif</Label>
            <Input
              id="effectif"
              type="number"
              min={0}
              value={effectif}
              onChange={(e) => setEffectif(e.target.value)}
              onBlur={() => {
                const n = Number(effectif);
                persist({ effectif: effectif ? (Number.isFinite(n) ? n : undefined) : undefined });
              }}
              placeholder="80"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ca-estime">CA estimé</Label>
            <Input
              id="ca-estime"
              type="number"
              min={0}
              value={caEstime}
              onChange={(e) => setCaEstime(e.target.value)}
              onBlur={() => {
                const n = Number(caEstime);
                persist({ ca_estime: caEstime ? (Number.isFinite(n) ? n : undefined) : undefined });
              }}
              placeholder="12000000"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persist({ notes_md: notes.trim() || undefined })}
            placeholder="Notes libres (markdown)"
          />
        </div>
      </section>

      {/* Contacts */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" /> Contacts ({contacts?.length ?? "…"})
          </h2>
          <NewContactDialog defaultSocieteId={id} />
        </div>
        {contacts === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : contacts.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucun contact lié.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {contacts.map((c) => (
              <Link
                key={c._id}
                href={`/contacts/${c._id}` as any}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {c.prenom[0]}{c.nom[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.prenom} {c.nom}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.intitule_poste ?? "—"}{c.email ? ` · ${c.email}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Separator className="my-6" />

      {/* Deals */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Deals ({deals?.length ?? "…"})</h2>
          <NewDealDialog />
        </div>
        {deals === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : deals.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucun deal lié.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {deals.map((d) => (
              <div key={d._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{d.titre}</div>
                  <div className="text-xs text-muted-foreground">{d.stage}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium tabular-nums">{formatMontant(d.montant, d.devise)}</div>
                  {d.date_closing_prevue && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {formatDate(d.date_closing_prevue)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator className="my-6" />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Réunions ({reunions?.length ?? "…" })</h2>
          <LogReunionDialog attachedTo={{ kind: "societe", id }} />
        </div>
        {reunions === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : reunions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucune réunion liée.
          </p>
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

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium">Contrats ({contrats?.length ?? "…" })</h2>
        {contrats === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : contrats.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucun contrat lié.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {contrats.map((contrat) => (
              <Link key={contrat._id} href={`/contrats/${contrat._id}` as any} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30">
                <span>{contrat.statut}</span>
                <span className="font-medium">{formatMontant(contrat.montant_total, contrat.devise)}</span>
              </Link>
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
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
