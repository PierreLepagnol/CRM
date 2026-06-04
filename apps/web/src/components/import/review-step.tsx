"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { normalizeEntrepriseName } from "@CRM-APP/backend/convex/lib/entrepriseLogic";
import {
  buildEnrichmentPatch,
  type ClassifiedValues,
  type ContactMergeInput,
  type EnrichmentStrategyField,
  type ImportRowInput,
} from "@CRM-APP/backend/convex/lib/importLogic";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button } from "@CRM-APP/ui/components/button";
import { Checkbox } from "@CRM-APP/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@CRM-APP/ui/components/table";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EntrepriseCombobox,
  type EntrepriseValue,
} from "@/components/entreprise-combobox";
import { ENRICHMENT_FIELDS, MERGE_STRATEGY_ITEMS } from "@/lib/contact-import";

export type CommitSummary = {
  created: number;
  enriched: number;
  /** Doublons sans changement (« déjà à jour ») : comptés comme ignorés (cf. ADR 0002). */
  unchanged: number;
  skipped: number;
  errors: string[];
};

type Strategy = "fill_if_empty" | "overwrite" | "ignore";

type EntAction =
  | { kind: "create" }
  | { kind: "skip" }
  | { kind: "existing"; entreprise_id: Id<"entreprises">; nom: string };

const ENT_ACTION_ITEMS = [
  { value: "create", label: "Créer l'entreprise" },
  { value: "existing", label: "Choisir une existante" },
  { value: "skip", label: "Ne pas rattacher" },
];

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  telephone: "Téléphone",
  linkedin_url: "Profil LinkedIn",
  poste: "Poste",
  montant: "Montant",
  notes_md: "Notes",
  entreprise_id: "Entreprise",
};

export function ReviewStep({
  rows,
  onBack,
  onDone,
}: {
  rows: ImportRowInput[];
  onBack: () => void;
  onDone: (summary: CommitSummary) => void;
}) {
  const classified = useQuery(api.contactImport.classify, { rows });
  const commit = useMutation(api.contactImport.commit);

  const [strategies, setStrategies] = useState<Record<EnrichmentStrategyField, Strategy>>(
    () =>
      Object.fromEntries(ENRICHMENT_FIELDS.map((f) => [f.key, "fill_if_empty"])) as Record<
        EnrichmentStrategyField,
        Strategy
      >,
  );
  const [entResolutions, setEntResolutions] = useState<Record<string, EntAction>>({});
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [committing, setCommitting] = useState(false);

  const classifications = useMemo(
    () => classified?.classifications ?? [],
    [classified],
  );

  // Noms d'entreprise non reconnus, dédupliqués par nom normalisé (résolus une fois).
  const unresolved = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of classifications) {
      if (c.kind !== "error" && c.entreprise.kind === "unresolved") {
        const key = normalizeEntrepriseName(c.entreprise.nom);
        if (!seen.has(key)) seen.set(key, c.entreprise.nom);
      }
    }
    return [...seen.entries()].map(([key, nom]) => ({ key, nom }));
  }, [classifications]);

  if (classified === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const counts = classifications.reduce(
    (acc, c) => {
      acc[c.kind] += 1;
      return acc;
    },
    { creation: 0, enrichissement: 0, error: 0 } as Record<string, number>,
  );

  const acceptedCount = classifications.filter(
    (c, i) => c.kind !== "error" && !rejected.has(i),
  ).length;

  const actionOf = (key: string): EntAction => entResolutions[key] ?? { kind: "create" };

  const resolvedEntrepriseId = (
    c: (typeof classifications)[number],
  ): string | undefined => {
    if (c.kind === "error") return undefined;
    if (c.entreprise.kind === "matched") return c.entreprise.entrepriseId;
    if (c.entreprise.kind === "unresolved") {
      const action = actionOf(normalizeEntrepriseName(c.entreprise.nom));
      return action.kind === "existing" ? action.entreprise_id : undefined;
    }
    return undefined;
  };

  // Patch d'enrichissement calculé pour une ligne (selon la stratégie courante).
  // Un patch vide ⇒ « déjà à jour » : le commit ne touchera rien (cf. ADR 0002).
  const enrichmentPatchOf = (c: (typeof classifications)[number]) => {
    if (c.kind !== "enrichissement") return undefined;
    const existing = classified.matchedContacts?.[c.matchedContactId];
    if (!existing) return undefined;
    return buildEnrichmentPatch(
      existing as ContactMergeInput,
      c.values as ClassifiedValues,
      strategies,
      resolvedEntrepriseId(c),
    );
  };

  // Un enrichissement dont le patch est vide ne sera pas écrit : compté « déjà à jour ».
  const unchangedCount = classifications.filter((c) => {
    const patch = enrichmentPatchOf(c);
    return patch !== undefined && Object.keys(patch).length === 0;
  }).length;
  const changedEnrichments = counts.enrichissement - unchangedCount;

  const toggleRejected = (i: number) =>
    setRejected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const toggleExpanded = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onCommit = async () => {
    setCommitting(true);
    try {
      const entrepriseResolutions = unresolved.map(({ key, nom }) => {
        const a = actionOf(key);
        if (a.kind === "existing")
          return {
            nom,
            action: { kind: "existing" as const, entreprise_id: a.entreprise_id },
          };
        if (a.kind === "skip") return { nom, action: { kind: "skip" as const } };
        return { nom, action: { kind: "create" as const } };
      });
      const result = await commit({
        rows,
        fieldStrategies: strategies,
        entrepriseResolutions,
        rejectedIndexes: [...rejected],
      });
      onDone(result);
    } catch {
      toast.error("Échec de l'import.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Récapitulatif */}
      <div className="flex flex-wrap gap-3 text-sm">
        <Badge variant="secondary">{counts.creation} créations</Badge>
        <Badge variant="secondary">{changedEnrichments} enrichissements</Badge>
        {unchangedCount > 0 && (
          <Badge variant="outline">{unchangedCount} déjà à jour</Badge>
        )}
        {counts.error > 0 && (
          <Badge variant="destructive">{counts.error} en erreur</Badge>
        )}
        {(classified.collapseWarnings?.length ?? 0) > 0 && (
          <Badge variant="outline">
            {classified.collapseWarnings.length} doublon
            {classified.collapseWarnings.length > 1 ? "s" : ""} intra-fichier fusionné
            {classified.collapseWarnings.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Stratégie par champ (enrichissements) */}
      {counts.enrichissement > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">
            Stratégie d'enrichissement (par champ, pour tout le lot)
          </h3>
          <p className="text-xs text-muted-foreground">
            Par défaut « remplir si vide » : une donnée déjà saisie n'est jamais écrasée.
            Les notes sont concaténées.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ENRICHMENT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2">
                <span className="text-sm">{f.label}</span>
                <Select
                  items={[...MERGE_STRATEGY_ITEMS]}
                  value={strategies[f.key]}
                  onValueChange={(v) =>
                    setStrategies((s) => ({ ...s, [f.key]: v as Strategy }))
                  }
                >
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MERGE_STRATEGY_ITEMS.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Résolution des entreprises non reconnues */}
      {unresolved.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">
            Entreprises non reconnues ({unresolved.length})
          </h3>
          {unresolved.map(({ key, nom }) => (
            <EntrepriseResolutionRow
              key={key}
              nom={nom}
              action={actionOf(key)}
              onChange={(action) =>
                setEntResolutions((prev) => ({ ...prev, [key]: action }))
              }
            />
          ))}
        </section>
      )}

      {/* Lignes */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
              <TableHead>Contact</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classifications.map((c, i) => {
              const existing =
                c.kind === "enrichissement" && classified.matchedContacts
                  ? classified.matchedContacts[c.matchedContactId]
                  : undefined;
              const patch =
                c.kind === "enrichissement" && existing
                  ? buildEnrichmentPatch(
                      existing as ContactMergeInput,
                      c.values as ClassifiedValues,
                      strategies,
                      resolvedEntrepriseId(c),
                    )
                  : {};
              const patchKeys = Object.keys(patch);
              return (
                <Fragment key={i}>
                  <TableRow
                    className={c.kind === "error" ? "bg-destructive/5" : undefined}
                  >
                    <TableCell>
                      {c.kind !== "error" && (
                        <Checkbox
                          checked={!rejected.has(i)}
                          onCheckedChange={() => toggleRejected(i)}
                          aria-label="Accepter cette ligne"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {c.kind === "enrichissement" && patchKeys.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(i)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Voir le détail"
                        >
                          {expanded.has(i) ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.kind === "error"
                        ? rowLabel(rows[i])
                        : `${c.values.prenom} ${c.values.nom}`}
                      {c.kind !== "error" && c.values.email && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {c.values.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.kind === "error" ? "—" : <EntrepriseCell classification={c} />}
                    </TableCell>
                    <TableCell>
                      {c.kind === "error" ? (
                        <Badge variant="destructive">{c.errors.join(", ")}</Badge>
                      ) : c.kind === "enrichissement" ? (
                        patchKeys.length === 0 ? (
                          <Badge variant="outline">Déjà à jour</Badge>
                        ) : (
                          <Badge variant="secondary">Enrichissement</Badge>
                        )
                      ) : (
                        <Badge variant="default">Création</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  {c.kind === "enrichissement" &&
                    expanded.has(i) &&
                    patchKeys.length > 0 &&
                    existing && (
                      <TableRow>
                        <TableCell />
                        <TableCell colSpan={4} className="whitespace-normal">
                          <div className="flex flex-col gap-1 py-1 text-xs">
                            {patchKeys.map((field) => (
                              <div key={field} className="flex gap-2">
                                <span className="w-28 shrink-0 font-medium">
                                  {FIELD_LABELS[field] ?? field}
                                </span>
                                <span className="text-muted-foreground line-through">
                                  {displayValue(
                                    (existing as Record<string, unknown>)[field],
                                  ) || "(vide)"}
                                </span>
                                <span>→</span>
                                <span className="text-emerald-600">
                                  {field === "entreprise_id"
                                    ? "rattachée"
                                    : displayValue(
                                        (patch as Record<string, unknown>)[field],
                                      )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {acceptedCount} ligne{acceptedCount > 1 ? "s" : ""} à importer
          </span>
          <Button disabled={committing || acceptedCount === 0} onClick={onCommit}>
            {committing ? "Import…" : `Importer ${acceptedCount} contact${acceptedCount > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EntrepriseCell({
  classification,
}: {
  classification: { entreprise: { kind: string; nom?: string } };
}) {
  const e = classification.entreprise;
  if (e.kind === "none") return <>—</>;
  if (e.kind === "matched") return <span className="text-emerald-600">rattachée</span>;
  return <span>{e.nom} (à résoudre)</span>;
}

function EntrepriseResolutionRow({
  nom,
  action,
  onChange,
}: {
  nom: string;
  action: EntAction;
  onChange: (action: EntAction) => void;
}) {
  const [picked, setPicked] = useState<EntrepriseValue>({ nom: "" });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-40 flex-1 text-sm font-medium">{nom}</span>
      <Select
        items={ENT_ACTION_ITEMS}
        value={action.kind}
        onValueChange={(v) => {
          if (v === "existing") {
            onChange(
              picked.id
                ? { kind: "existing", entreprise_id: picked.id, nom: picked.nom }
                : { kind: "create" },
            );
          } else {
            onChange({ kind: v as "create" | "skip" });
          }
        }}
      >
        <SelectTrigger className="h-8 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ENT_ACTION_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {action.kind === "existing" && (
        <div className="w-64">
          <EntrepriseCombobox
            value={picked}
            onChange={(next) => {
              setPicked(next);
              if (next.id) onChange({ kind: "existing", entreprise_id: next.id, nom: next.nom });
            }}
          />
        </div>
      )}
    </div>
  );
}

function rowLabel(row: ImportRowInput): string {
  const name = [row.prenom, row.nom].filter(Boolean).join(" ").trim();
  return name || row.email || "(ligne sans nom)";
}

function displayValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}
