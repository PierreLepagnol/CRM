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
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Authenticated, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { downloadHtmlPdf } from "@/lib/export";
import { formatDate, formatMontant } from "@/lib/format";

const STATUTS = [
  ["actif", "Actif"],
  ["en_pause", "En pause"],
  ["termine", "Terminé"],
  ["resilie", "Résilié"],
] as const;

const FREQUENCES = [
  ["mensuel", "Mensuel"],
  ["trimestriel", "Trimestriel"],
  ["annuel", "Annuel"],
  ["unique", "Unique"],
] as const;

export default function ContratDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Contrat">
      <Authenticated>
        <ContratDetail id={id as Id<"contrats">} />
      </Authenticated>
    </AppShell>
  );
}

function ContratDetail({ id }: { id: Id<"contrats"> }) {
  const contrat = useQuery(api.contrats.get, { id });
  const update = useMutation(api.contrats.update);
  const remove = useMutation(api.contrats.remove);
  const router = useRouter();

  const societe = useQuery(api.societes.get, contrat ? { id: contrat.societe_id } : "skip");
  const deal = useQuery(api.deals.get, contrat ? { id: contrat.deal_id } : "skip");

  const [montant, setMontant] = useState("");
  const [tva, setTva] = useState("");
  const [dateSignature, setDateSignature] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    if (!contrat) return;
    setMontant(String(contrat.montant_total));
    setTva(contrat.tva != null ? String(contrat.tva) : "");
    setDateSignature(new Date(contrat.date_signature).toISOString().slice(0, 10));
    setDateDebut(new Date(contrat.date_debut).toISOString().slice(0, 10));
    setDateFin(contrat.date_fin ? new Date(contrat.date_fin).toISOString().slice(0, 10) : "");
  }, [contrat?._id]);

  if (contrat === undefined) return <DetailSkeleton />;
  if (contrat === null) return <div className="p-8 text-sm text-muted-foreground">Contrat introuvable.</div>;

  const persist = async (patch: Parameters<typeof update>[0]["patch"]) => {
    try {
      await update({ id, patch });
      toast.success("Contrat mis à jour.");
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  const exportPdf = () => {
    downloadHtmlPdf(`contrat-${id}.html`, `Contrat ${societe?.nom ?? ""}`, [
      ["Société", societe?.nom ?? ""],
      ["Deal", deal?.titre ?? ""],
      ["Statut", contrat.statut],
      ["Montant", formatMontant(contrat.montant_total, contrat.devise)],
      ["Fréquence", contrat.frequence_facturation],
      ["Signature", formatDate(contrat.date_signature)],
      ["Début", formatDate(contrat.date_debut)],
      ["Fin", contrat.date_fin ? formatDate(contrat.date_fin) : ""],
    ]);
  };

  const onDelete = async () => {
    if (!confirm("Supprimer ce contrat ?")) return;
    await remove({ id });
    router.push("/contrats");
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <Link href="/contrats" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Contrats
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{societe?.nom ?? "Contrat"}</h1>
          <p className="text-sm text-muted-foreground">{deal?.titre ?? "Deal source"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Download data-icon="inline-start" />
            PDF
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Statut</Label>
          <Select value={contrat.statut} onValueChange={(value) => persist({ statut: value as typeof contrat.statut })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{STATUTS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fréquence</Label>
          <Select value={contrat.frequence_facturation} onValueChange={(value) => persist({ frequence_facturation: value as typeof contrat.frequence_facturation })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{FREQUENCES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="montant">Montant total</Label>
          <Input id="montant" type="number" value={montant} onChange={(e) => setMontant(e.target.value)} onBlur={() => persist({ montant_total: Number(montant) || 0 })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tva">TVA (%)</Label>
          <Input id="tva" type="number" value={tva} onChange={(e) => setTva(e.target.value)} onBlur={() => persist({ tva: tva ? Number(tva) : undefined })} />
        </div>
        <DateField label="Signature" value={dateSignature} onChange={setDateSignature} onBlur={() => persist({ date_signature: new Date(dateSignature).getTime() })} />
        <DateField label="Début" value={dateDebut} onChange={setDateDebut} onBlur={() => persist({ date_debut: new Date(dateDebut).getTime() })} />
        <DateField label="Fin" value={dateFin} onChange={setDateFin} onBlur={() => persist({ date_fin: dateFin ? new Date(dateFin).getTime() : undefined })} />
      </section>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

