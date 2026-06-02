import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";

import { stageLabel } from "./crm";
import { formatDate, formatEuros } from "./format";

type ContactRow = Pick<
  Doc<"contacts">,
  | "prenom"
  | "nom"
  | "entreprise"
  | "email"
  | "telephone"
  | "poste"
  | "owner_id"
  | "responsible_ids"
  | "montant"
  | "stage"
  | "next_relance_at"
>;

/**
 * Construit les lignes CSV d'export des contacts. Le propriétaire et les
 * responsables sont résolus en noms via `resolveName` (remplace l'ancien champ
 * texte libre `contact_sciam`). Fonction pure → testable sans le DOM.
 */
export function buildContactCsvRows(
  contacts: ContactRow[],
  resolveName: (userId: string) => string | undefined,
): Array<Record<string, string>> {
  return contacts.map((c) => ({
    Prénom: c.prenom,
    Nom: c.nom,
    Entreprise: c.entreprise ?? "",
    Email: c.email ?? "",
    Téléphone: c.telephone ?? "",
    Poste: c.poste ?? "",
    Propriétaire: c.owner_id ? (resolveName(c.owner_id) ?? "") : "",
    Responsables: (c.responsible_ids ?? [])
      .map((id) => resolveName(id))
      .filter((name): name is string => Boolean(name))
      .join(", "),
    Montant: formatEuros(c.montant ?? 0),
    Stage: stageLabel(c.stage),
    "Prochaine relance": c.next_relance_at ? formatDate(c.next_relance_at) : "",
  }));
}
