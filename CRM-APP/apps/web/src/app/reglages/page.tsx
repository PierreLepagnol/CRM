"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc, Id } from "@CRM-APP/backend/convex/_generated/dataModel";
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
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { downloadJson } from "@/lib/export";

export default function ReglagesPage() {
  return (
    <AppShell title="Réglages">
      <AuthLoading>
        <div className="p-8 flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AuthLoading>
      <Authenticated><ReglagesContent /></Authenticated>
      <Unauthenticated>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour accéder aux réglages.
        </p>
      </Unauthenticated>
    </AppShell>
  );
}

const TAG_SCOPES: Array<{ value: Doc<"tags">["scope"]; label: string }> = [
  { value: "societe", label: "Société" },
  { value: "contact", label: "Contact" },
  { value: "deal", label: "Deal" },
];

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#d946ef", "#ec4899",
];

function ReglagesContent() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-8">
      <MembersSection />
      <Separator />
      <TagsSection />
      <Separator />
      <PipelineSection />
      <Separator />
      <ExportSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function TagsSection() {
  const tags = useQuery(api.tags.listWithUsage, {});
  const createTag = useMutation(api.tags.create);
  const updateTag = useMutation(api.tags.update);
  const removeTag = useMutation(api.tags.remove);

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[5]);
  const [newScope, setNewScope] = useState<Doc<"tags">["scope"]>("deal");
  const [editId, setEditId] = useState<Id<"tags"> | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const onCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      await createTag({ label: newLabel.trim(), couleur: newColor, scope: newScope });
      setNewLabel("");
      toast.success("Tag créé.");
    } catch {
      toast.error("Échec de la création.");
    }
  };

  const onSaveEdit = async (id: Id<"tags">) => {
    if (!editLabel.trim()) return;
    try {
      await updateTag({ id, patch: { label: editLabel.trim() } });
      setEditId(null);
      toast.success("Tag renommé.");
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  const onRemove = async (id: Id<"tags">) => {
    if (!confirm("Supprimer ce tag ?")) return;
    try {
      await removeTag({ id });
      toast.success("Tag supprimé.");
    } catch {
      toast.error("Échec de la suppression.");
    }
  };

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Tags</h2>

      {/* Création */}
      <form onSubmit={onCreateTag} className="mb-4 flex items-end gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="tag-label">Nouveau tag</Label>
          <Input
            id="tag-label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="ex: stratégique"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Scope</Label>
          <Select
            value={newScope}
            onValueChange={(v) => setNewScope(v as Doc<"tags">["scope"])}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TAG_SCOPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Couleur</Label>
          <div className="flex items-center gap-1">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`size-5 rounded-full transition-transform ${newColor === c ? "ring-2 ring-offset-1 ring-foreground scale-110" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Button type="submit" size="sm" disabled={!newLabel.trim()}>
          <Plus data-icon="inline-start" /> Créer
        </Button>
      </form>

      {/* Liste */}
      {tags === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : tags.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Aucun tag. Créez-en un ci-dessus.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tags.map((tag) => (
            <div key={tag._id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: tag.couleur }}
              />
              {editId === tag._id ? (
                <Input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => onSaveEdit(tag._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tag._id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  className="h-7 w-40 py-0 text-sm"
                />
              ) : (
                <span className="flex-1 text-sm font-medium">{tag.label}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {TAG_SCOPES.find((s) => s.value === tag.scope)?.label} · {tag.usage} usage(s)
              </span>
              <button
                type="button"
                onClick={() => { setEditId(tag._id); setEditLabel(tag.label); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(tag._id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pipeline (read-only display)
// ---------------------------------------------------------------------------

function PipelineSection() {
  const stages = ["Lead", "Qualifié", "Proposition", "Négo", "Signé", "Perdu"];
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">Pipeline</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Stages fixes en v1. Modifiables dans une prochaine version.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded-md border bg-muted/40 px-2 py-0.5">{s}</span>
            {i < stages.length - 1 && <span className="text-muted-foreground">→</span>}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function ExportSection() {
  const backup = useQuery(api.exports.allData, {});
  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Données</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Export CSV disponible depuis les vues Liste. Le backup JSON complet est exportable ici.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!backup}
          onClick={() => backup && downloadJson("crm-backup.json", backup)}
        >
          <Download data-icon="inline-start" />
          Exporter tout (JSON)
        </Button>
      </div>
    </section>
  );
}

function MembersSection() {
  const user = useQuery(api.auth.getCurrentUser);
  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Membres de l&apos;équipe</h2>
      <div className="rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <div className="font-medium">{user?.name ?? "Utilisateur courant"}</div>
            <div className="text-xs text-muted-foreground">{user?.email ?? "Session active"}</div>
          </div>
          <span className="text-xs text-muted-foreground">Membre</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Les invitations et retraits dépendront du provider email retenu.
      </p>
    </section>
  );
}
