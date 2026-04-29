import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Mail, MessageSquare, Phone } from "lucide-react";
import type { ElementType } from "react";

export type ContactStage = Doc<"contacts">["stage"];
export type ProjectStatut = Doc<"projects">["statut"];
export type InteractionType = Doc<"interactions">["type"];

export const STAGES = [
  { id: "nouveau" as ContactStage, label: "Nouveau", badgeClass: "bg-slate-100 text-slate-700" },
  { id: "contacte" as ContactStage, label: "Contacté", badgeClass: "bg-sky-100 text-sky-700" },
  { id: "rdv" as ContactStage, label: "RDV", badgeClass: "bg-indigo-100 text-indigo-700" },
  { id: "proposition" as ContactStage, label: "Proposition", badgeClass: "bg-amber-100 text-amber-700" },
  { id: "gagne" as ContactStage, label: "Gagné", badgeClass: "bg-emerald-100 text-emerald-700" },
  { id: "perdu" as ContactStage, label: "Perdu", badgeClass: "bg-rose-100 text-rose-700" },
] as const;

export const STATUTS = [
  { id: "a_demarrer" as ProjectStatut, label: "À démarrer", badgeClass: "bg-slate-100 text-slate-700" },
  { id: "en_cours" as ProjectStatut, label: "En cours", badgeClass: "bg-sky-100 text-sky-700" },
  { id: "en_revision" as ProjectStatut, label: "En révision", badgeClass: "bg-amber-100 text-amber-700" },
  { id: "termine" as ProjectStatut, label: "Terminé", badgeClass: "bg-emerald-100 text-emerald-700" },
] as const;

export const INTERACTION_TYPES: { id: InteractionType; label: string; icon: ElementType }[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "appel", label: "Appel", icon: Phone },
  { id: "rdv", label: "RDV", icon: MessageSquare },
  { id: "linkedin", label: "LinkedIn", icon: MessageSquare },
];

export function stageLabel(id: ContactStage) {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export function stageBadgeClass(id: ContactStage) {
  return STAGES.find((s) => s.id === id)?.badgeClass ?? "";
}

export function statutLabel(id: ProjectStatut) {
  return STATUTS.find((s) => s.id === id)?.label ?? id;
}

export function statutBadgeClass(id: ProjectStatut) {
  return STATUTS.find((s) => s.id === id)?.badgeClass ?? "";
}

export function interactionLabel(id: InteractionType) {
  return INTERACTION_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function interactionIcon(id: InteractionType) {
  return INTERACTION_TYPES.find((t) => t.id === id)?.icon ?? Mail;
}
