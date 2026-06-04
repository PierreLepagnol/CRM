"use client";

import { Button } from "@CRM-APP/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@CRM-APP/ui/components/table";
import { CheckCircle2, FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

import {
  autoDetectMapping,
  IMPORT_FIELDS,
  mapRowsToImportInput,
  type ImportFieldKey,
} from "@/lib/contact-import";
import { parseImportFile, type ParsedFile } from "@/lib/parse-file";

import { ReviewStep, type CommitSummary } from "./review-step";

/** Plafond dur, aligné sur `contactImport.MAX_IMPORT_ROWS` (commit atomique, ADR 0002). */
const MAX_ROWS = 500;

/** Types acceptés par le dépôt : CSV + XLSX/XLS (cf. ADR 0002). */
const ACCEPT: Record<string, string[]> = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv", ".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

const NONE = "__none__";
const FIELD_ITEMS = [
  { value: NONE, label: "— Ignorer —" },
  ...IMPORT_FIELDS.map((f) => ({
    value: f.key,
    label: "required" in f && f.required ? `${f.label} *` : f.label,
  })),
];

type Step = "map" | "review" | "done";

export function ImportWizard() {
  const [step, setStep] = useState<Step>("map");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  const importRows = useMemo(
    () => (parsed ? mapRowsToImportInput(parsed.rows, mapping) : []),
    [parsed, mapping],
  );

  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const canContinue = mappedFields.has("prenom") && mappedFields.has("nom");

  const onFile = async (file: File) => {
    setFileError(null);
    try {
      const result = await parseImportFile(file);
      if (result.headers.length === 0 || result.rows.length === 0) {
        setFileError("Fichier vide ou illisible.");
        return;
      }
      if (result.rows.length > MAX_ROWS) {
        setFileError(
          `Fichier trop volumineux : ${result.rows.length} lignes (max ${MAX_ROWS}).`,
        );
        return;
      }
      setParsed(result);
      setMapping(autoDetectMapping(result.headers));
      setFileName(file.name);
    } catch {
      setFileError("Échec de la lecture du fichier.");
    }
  };

  const onDrop = (accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      const code = rejections[0]?.errors[0]?.code;
      setFileError(
        code === "too-many-files"
          ? "Un seul fichier à la fois."
          : code === "file-invalid-type"
            ? "Format non supporté : choisissez un fichier CSV ou XLSX."
            : "Fichier refusé.",
      );
      return;
    }
    const f = accepted[0];
    if (f) void onFile(f);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    multiple: false,
    maxFiles: 1,
    onDrop,
  });

  const reset = () => {
    setStep("map");
    setParsed(null);
    setFileName("");
    setMapping({});
    setFileError(null);
    setSummary(null);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4">
      <Stepper step={step} />

      {step === "map" && (
        <div className="flex flex-col gap-4">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/30 ${
              isDragActive ? "border-foreground/50 bg-muted/50" : ""
            }`}
          >
            <input {...getInputProps()} />
            <FileUp className="size-8" />
            <span className="text-sm font-medium text-foreground">
              {isDragActive
                ? "Déposez le fichier ici…"
                : fileName ||
                  "Glissez un fichier CSV ou XLSX, ou cliquez pour parcourir"}
            </span>
            <span className="text-xs">
              {parsed
                ? `${parsed.rows.length} ligne${parsed.rows.length > 1 ? "s" : ""} · ${parsed.headers.length} colonnes`
                : `Jusqu'à ${MAX_ROWS} contacts. Chaque contact entre comme Prospect.`}
            </span>
          </div>

          {fileError && <p className="text-sm text-destructive">{fileError}</p>}

          {parsed && (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colonne du fichier</TableHead>
                      <TableHead>Exemple</TableHead>
                      <TableHead className="w-56">Champ contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {parsed.rows[0]?.[header] || "—"}
                        </TableCell>
                        <TableCell>
                          <FieldSelect
                            value={mapping[header] || ""}
                            onChange={(key) =>
                              setMapping((m) => ({ ...m, [header]: key }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {canContinue
                    ? "Prénom et Nom sont mappés."
                    : "Mappez au moins Prénom et Nom pour continuer."}
                </p>
                <Button disabled={!canContinue} onClick={() => setStep("review")}>
                  Continuer
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "review" && (
        <ReviewStep
          rows={importRows}
          onBack={() => setStep("map")}
          onDone={(result) => {
            setSummary(result);
            setStep("done");
          }}
        />
      )}

      {step === "done" && summary && (
        <DoneStep summary={summary} onReset={reset} />
      )}
    </div>
  );
}

function FieldSelect({
  value,
  onChange,
}: {
  value: ImportFieldKey | "";
  onChange: (key: ImportFieldKey | "") => void;
}) {
  return (
    <Select
      items={FIELD_ITEMS}
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? "" : (v as ImportFieldKey))}
    >
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {FIELD_ITEMS.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function DoneStep({
  summary,
  onReset,
}: {
  summary: CommitSummary;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border p-10 text-center">
      <CheckCircle2 className="size-10 text-emerald-600" />
      <h2 className="text-lg font-semibold">Import terminé</h2>
      <div className="flex gap-6 text-sm">
        <span>
          <strong className="text-emerald-600">{summary.created}</strong> créés
        </span>
        <span>
          <strong className="text-sky-600">{summary.enriched}</strong> enrichis
        </span>
        <span>
          <strong className="text-muted-foreground">
            {summary.skipped + summary.unchanged}
          </strong>{" "}
          ignorés
          {summary.unchanged > 0 && (
            <span className="text-muted-foreground">
              {" "}
              (dont {summary.unchanged} déjà à jour)
            </span>
          )}
        </span>
      </div>
      {summary.errors.length > 0 && (
        <ul className="max-h-40 w-full overflow-auto rounded-md border bg-muted/30 p-3 text-left text-xs text-destructive">
          {summary.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset}>
          Importer un autre fichier
        </Button>
        <Button render={<Link href="/contacts" />}>Voir les contacts</Button>
      </div>
    </div>
  );
}

const STEPS: { key: Step; label: string }[] = [
  { key: "map", label: "1. Mapper" },
  { key: "review", label: "2. Vérifier" },
  { key: "done", label: "3. Importer" },
];

function Stepper({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => (
        <span
          key={s.key}
          className={
            i === activeIndex
              ? "font-semibold text-foreground"
              : i < activeIndex
                ? "text-emerald-600"
                : "text-muted-foreground"
          }
        >
          {s.label}
          {i < STEPS.length - 1 && <span className="mx-2 text-muted-foreground">→</span>}
        </span>
      ))}
    </div>
  );
}
