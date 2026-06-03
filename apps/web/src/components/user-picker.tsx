"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@CRM-APP/ui/components/avatar";
import { Button } from "@CRM-APP/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@CRM-APP/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { useQuery } from "convex/react";
import { ChevronsUpDown } from "lucide-react";

export type AppUserOption = {
  user_id: string;
  name: string;
  email: string;
  image?: string;
};

export function userInitials(name: string) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function useAppUsers(): AppUserOption[] {
  const users = useQuery(api.users.list, {});
  return (users ?? []).map((u) => ({
    user_id: u.user_id,
    name: u.name,
    email: u.email,
    image: u.image,
  }));
}

const NONE = "__none__";

/** Utilisateur complet (avec image) depuis son id, ou `undefined` si inconnu. */
export function resolveUser(
  userId: string | undefined,
  users: AppUserOption[],
): AppUserOption | undefined {
  return users.find((u) => u.user_id === userId);
}

/** Nom d'un utilisateur depuis son id, ou `undefined` si inconnu. */
export function resolveUserName(
  userId: string | undefined,
  users: AppUserOption[],
): string | undefined {
  return resolveUser(userId, users)?.name;
}

/**
 * Résout l'`owner_id` stocké vers un libellé humain pour l'affichage.
 * base-ui n'expose pas la liste des items au `Select.Value` fermé : sans
 * résolution explicite, il sérialise la valeur brute (l'ID interne). On mappe
 * donc nous-mêmes l'ID vers le nom de l'utilisateur.
 */
export function resolveOwnerLabel(
  value: string | undefined,
  users: AppUserOption[],
): string {
  if (!value || value === NONE) return "Aucun propriétaire";
  return resolveUserName(value, users) ?? "Utilisateur inconnu";
}

/** Sélecteur de propriétaire (un seul utilisateur). */
export function OwnerSelect({
  value,
  onChange,
  users,
}: {
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
  users: AppUserOption[];
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v && v !== NONE ? (v as string) : undefined)}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{(v) => resolveOwnerLabel(v as string | undefined, users)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Aucun propriétaire</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.user_id} value={u.user_id}>
            <span className="flex items-center gap-2">
              <Avatar size="sm">
                {u.image && <AvatarImage src={u.image} alt={u.name} />}
                <AvatarFallback>{userInitials(u.name)}</AvatarFallback>
              </Avatar>
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Sélecteur multiple de responsables. */
export function ResponsiblesMultiSelect({
  value,
  onChange,
  users,
}: {
  value: string[];
  onChange: (userIds: string[]) => void;
  users: AppUserOption[];
}) {
  const selected = users.filter((u) => value.includes(u.user_id));

  const toggle = (userId: string, checked: boolean) => {
    if (checked) onChange([...value, userId]);
    else onChange(value.filter((id) => id !== userId));
  };

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="w-full justify-between font-normal" />
          }
        >
          <span className="truncate">
            {selected.length === 0
              ? "Aucun responsable"
              : `${selected.length} responsable${selected.length > 1 ? "s" : ""}`}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-card" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Responsables</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {users.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Aucun utilisateur.
              </div>
            ) : (
              users.map((u) => (
                <DropdownMenuCheckboxItem
                  key={u.user_id}
                  checked={value.includes(u.user_id)}
                  onCheckedChange={(checked) => toggle(u.user_id, checked)}
                  closeOnClick={false}
                >
                  <span className="flex items-center gap-2">
                    <Avatar size="sm">
                      {u.image && <AvatarImage src={u.image} alt={u.name} />}
                      <AvatarFallback>{userInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    {u.name}
                  </span>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {selected.length > 0 && (
        <UserAvatarGroup users={selected} />
      )}
    </div>
  );
}

/** Affiche un groupe d'avatars (3 max + compteur). */
export function UserAvatarGroup({
  users,
  max = 3,
  size = "sm",
}: {
  users: AppUserOption[];
  max?: number;
  size?: "default" | "sm" | "lg";
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <AvatarGroup>
      {shown.map((u) => (
        <Avatar key={u.user_id} size={size} title={u.name}>
          {u.image && <AvatarImage src={u.image} alt={u.name} />}
          <AvatarFallback>{userInitials(u.name)}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && <AvatarGroupCount>+{extra}</AvatarGroupCount>}
    </AvatarGroup>
  );
}
