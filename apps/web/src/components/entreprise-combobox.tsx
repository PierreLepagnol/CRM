"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Input } from "@CRM-APP/ui/components/input";
import { cn } from "@CRM-APP/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Building2, Check, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

export type EntrepriseValue = { id?: Id<"entreprises">; nom: string };

/** Comparaison souple pour décider d'afficher l'option « Créer ». */
function looseEqual(a: string, b: string) {
  return a.trim().toLocaleLowerCase("fr") === b.trim().toLocaleLowerCase("fr");
}

/**
 * Champ entreprise du formulaire contact : autocomplétion « commence par » sur
 * les entreprises existantes + création à la volée (cf. CONTEXT.md / ADR 0001).
 * Le contact pointe toujours vers une Entreprise réelle (jamais du texte libre
 * orphelin) : sélectionner ou créer fixe `value.id`.
 */
export function EntrepriseCombobox({
  value,
  onChange,
  id,
  autoFocus,
}: {
  value: EntrepriseValue;
  onChange: (next: EntrepriseValue) => void;
  id?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const create = useMutation(api.entreprises.create);
  const q = value.nom.trim();
  const suggestions =
    useQuery(api.entreprises.searchByPrefix, open && q ? { q } : "skip") ?? [];

  const exactExists = suggestions.some((s) => looseEqual(s.nom, q));
  const showCreate = q.length > 0 && !exactExists && !value.id;

  const select = (next: EntrepriseValue) => {
    onChange(next);
    setOpen(false);
  };

  const onCreate = async () => {
    setCreating(true);
    try {
      const newId = await create({ nom: q });
      select({ id: newId, nom: q });
    } catch {
      toast.error("Échec de la création de l'entreprise.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          className="h-11 pl-9 pr-9 text-base"
          placeholder="Rechercher ou créer une entreprise…"
          value={value.nom}
          onChange={(e) => {
            // Toute frappe casse le rattachement précédent : on re-cherchera.
            onChange({ id: undefined, nom: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Laisse le temps au clic sur une suggestion d'aboutir.
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
        />
        {(value.nom || value.id) && (
          <button
            type="button"
            aria-label="Effacer l'entreprise"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => select({ id: undefined, nom: "" })}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {value.id && (
        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
          <Check className="size-3" /> Rattaché à une entreprise existante
        </p>
      )}

      {open && (q.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          onMouseDown={(e) => {
            // Empêche le blur de l'input avant le clic.
            e.preventDefault();
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {suggestions.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                role="option"
                aria-selected={value.id === s._id}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value.id === s._id && "bg-accent",
                )}
                onClick={() => select({ id: s._id, nom: s.nom })}
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                {s.nom}
              </button>
            </li>
          ))}

          {suggestions.length === 0 && !showCreate && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              Aucune entreprise.
            </li>
          )}

          {showCreate && (
            <li>
              <button
                type="button"
                disabled={creating}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={onCreate}
              >
                <Plus className="size-4 shrink-0" />
                {creating ? "Création…" : <>Créer «&nbsp;{q}&nbsp;»</>}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
