"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Button } from "@CRM-APP/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@CRM-APP/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type EntityType = "societes" | "contacts" | "deals";

type CsvRow = Record<string, string>;

// Champs disponibles par entité
const ENTITY_FIELDS: Record<EntityType, Array<{ value: string; label: string }>> = {
  societes: [
    { value: "nom", label: "Nom *" },
    { value: "siret", label: "SIRET" },
    { value: "site_web", label: "Site web" },
    { value: "ville", label: "Ville" },
    { value: "code_postal", label: "Code postal" },
    { value: "pays", label: "Pays" },
    { value: "secteur", label: "Secteur" },
    { value: "effectif", label: "Effectif" },
    { value: "notes_md", label: "Notes" },
    { value: "__skip", label: "— Ignorer —" },
  ],
  contacts: [
    { value: "prenom", label: "Prénom *" },
    { value: "nom", label: "Nom *" },
    { value: "email", label: "Email" },
    { value: "intitule_poste", label: "Intitulé de poste" },
    { value: "linkedin_url", label: "LinkedIn URL" },
    { value: "notes_md", label: "Notes" },
    { value: "__skip", label: "— Ignorer —" },
  ],
  deals: [
    { value: "titre", label: "Titre *" },
    { value: "societe", label: "Société *" },
    { value: "montant", label: "Montant" },
    { value: "probabilite", label: "Probabilité" },
    { value: "stage", label: "Stage" },
    { value: "date_closing_prevue", label: "Closing" },
    { value: "notes_md", label: "Notes" },
    { value: "__skip", label: "— Ignorer —" },
  ],
};

function guessMapping(headers: string[], entity: EntityType): Record<string, string> {
  const fields = ENTITY_FIELDS[entity];
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const match = fields.find((f) =>
      f.value !== "__skip" && (f.value === lower || f.label.toLowerCase().includes(lower.split("_")[0]))
    );
    mapping[h] = match?.value ?? "__skip";
  }
  return mapping;
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const records: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === "," || char === ";") && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(current.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) records.push(row);
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = records.slice(1).map((values) => {
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

type Props = {
  open: boolean;
  onClose: () => void;
  file?: File;
};

export function CsvImportDialog({ open, onClose, file: initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [entity, setEntity] = useState<EntityType>("societes");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: number } | null>(null);

  const { isAuthenticated } = useConvexAuth();
  const createSociete = useMutation(api.societes.create);
  const createContact = useMutation(api.contacts.create);
  const createDeal = useMutation(api.deals.create);
  const societes = useQuery(api.societes.listForPicker, isAuthenticated ? {} : "skip");
  const contacts = useQuery(api.contacts.listForPicker, isAuthenticated ? {} : "skip");
  const deals = useQuery(api.deals.listForKanban, isAuthenticated ? {} : "skip");

  const loadFile = useCallback(async (f: File, ent: EntityType) => {
    const text = await f.text();
    const { headers: h, rows: r } = parseCsv(text);
    setHeaders(h);
    setRows(r);
    setMapping(guessMapping(h, ent));
    setResult(null);
  }, []);

  const onFileChange = async (f: File) => {
    setFile(f);
    await loadFile(f, entity);
  };

  const onEntityChange = async (ent: EntityType) => {
    setEntity(ent);
    if (file) await loadFile(file, ent);
  };

  const onImport = async () => {
    setImporting(true);
    let created = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const mapped: Record<string, string> = {};
        for (const [header, field] of Object.entries(mapping)) {
          if (field && field !== "__skip" && row[header]) {
            mapped[field] = row[header];
          }
        }

        if (entity === "societes") {
          if (!mapped.nom) { errors++; continue; }
          await createSociete({
            nom: mapped.nom,
            siret: mapped.siret || undefined,
            site_web: mapped.site_web || undefined,
            ville: mapped.ville || undefined,
            code_postal: mapped.code_postal || undefined,
            pays: mapped.pays || undefined,
            secteur: mapped.secteur || undefined,
            effectif: mapped.effectif ? Number(mapped.effectif) || undefined : undefined,
            notes_md: mapped.notes_md || undefined,
            tags: [],
          });
          created++;
        } else if (entity === "contacts") {
          if (!mapped.nom) { errors++; continue; }
          if (
            mapped.email &&
            contacts?.some((c) => c.email?.toLocaleLowerCase("fr-FR") === mapped.email.toLocaleLowerCase("fr-FR"))
          ) {
            errors++;
            continue;
          }
          await createContact({
            prenom: mapped.prenom || "",
            nom: mapped.nom,
            email: mapped.email || undefined,
            intitule_poste: mapped.intitule_poste || undefined,
            linkedin_url: mapped.linkedin_url || undefined,
            notes_md: mapped.notes_md || undefined,
            telephones: [],
            tags: [],
          });
          created++;
        } else if (entity === "deals") {
          if (!mapped.titre || !mapped.societe) { errors++; continue; }
          const societe = societes?.find(
            (s) => s.nom.toLocaleLowerCase("fr-FR") === mapped.societe.toLocaleLowerCase("fr-FR"),
          );
          if (!societe) { errors++; continue; }
          if (
            deals?.some(
              (d) =>
                d.titre.toLocaleLowerCase("fr-FR") === mapped.titre.toLocaleLowerCase("fr-FR") &&
                d.societe_id === societe._id,
            )
          ) {
            errors++;
            continue;
          }
          const stage = ["lead", "qualifie", "proposition", "nego", "signe", "perdu"].includes(mapped.stage)
            ? (mapped.stage as "lead" | "qualifie" | "proposition" | "nego" | "signe" | "perdu")
            : "lead";
          await createDeal({
            titre: mapped.titre,
            societe_id: societe._id,
            contacts_ids: [],
            montant: mapped.montant ? Number(mapped.montant) || 0 : 0,
            devise: "EUR",
            probabilite: mapped.probabilite ? Number(mapped.probabilite) || 10 : 10,
            stage,
            date_closing_prevue: mapped.date_closing_prevue
              ? new Date(mapped.date_closing_prevue).getTime()
              : undefined,
            tags: [],
            notes_md: mapped.notes_md || undefined,
          });
          created++;
        }
      } catch {
        errors++;
      }
    }

    setResult({ created, errors });
    setImporting(false);
    toast.success(`Import terminé : ${created} créé(s), ${errors} erreur(s).`);
  };

  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    onClose();
  };

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer un CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Upload zone */}
          {!file ? (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/30 transition-colors">
              <Upload className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Déposez un fichier CSV ici</p>
                <p className="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2">
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{rows.length} lignes</span>
              <button type="button" onClick={() => { setFile(null); setHeaders([]); setRows([]); }}>
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          )}

          {/* Entité cible */}
          {file && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Cible :</span>
              <Select value={entity} onValueChange={(v) => onEntityChange(v as EntityType)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="societes">Sociétés</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="deals">Deals</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mapping */}
          {headers.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Mapping des colonnes</h3>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {headers.map((h) => (
                  <div key={h} className="grid grid-cols-2 items-center gap-3 text-sm">
                    <span className="text-muted-foreground">« {h} »</span>
                    <Select
                      value={mapping[h] ?? "__skip"}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v ?? "__skip" }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ENTITY_FIELDS[entity].map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu */}
          {previewRows.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Aperçu (5 premières lignes)</h3>
              <div className="overflow-x-auto rounded-lg border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 max-w-[120px] truncate text-muted-foreground">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Résultat */}
          {result && (
            <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
              ✅ {result.created} créé(s) · {result.errors} erreur(s)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {!result && rows.length > 0 && (
            <Button size="sm" onClick={onImport} disabled={importing}>
              {importing ? "Import en cours…" : `Importer ${rows.length} ligne(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
