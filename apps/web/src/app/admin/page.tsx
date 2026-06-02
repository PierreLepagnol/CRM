"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Id } from "@CRM-APP/backend/convex/_generated/dataModel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@CRM-APP/ui/components/avatar";
import { Checkbox } from "@CRM-APP/ui/components/checkbox";
import {
  Select,
  SelectContent,
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
import { Authenticated, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { userInitials } from "@/components/user-picker";
import type { PageKey, RoleKey } from "@/lib/use-access";

const ROLES: { id: RoleKey; label: string }[] = [
  { id: "admin", label: "Administrateur" },
  { id: "commercial", label: "Commercial" },
  { id: "lecteur", label: "Lecteur" },
];

const PAGES: { id: PageKey; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "contacts", label: "Contacts" },
  { id: "projets", label: "Projets" },
  { id: "admin", label: "Administration" },
];

const DEFAULT_ROLE_PAGES: Record<RoleKey, PageKey[]> = {
  admin: ["pipeline", "contacts", "projets", "admin"],
  commercial: ["pipeline", "contacts"],
  lecteur: ["pipeline"],
};

export default function AdminPage() {
  return (
    <AppShell title="Administration" pageKey="admin">
      <Authenticated>
        <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
          <UsersSection />
          <RolePermissionsSection />
        </div>
      </Authenticated>
    </AppShell>
  );
}

function UsersSection() {
  const users = useQuery(api.users.list, {});
  const setRole = useMutation(api.users.setRole);

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Utilisateurs &amp; rôles</h2>
        <p className="text-xs text-muted-foreground">
          Attribuez un rôle à chaque utilisateur connecté via Microsoft.
        </p>
      </div>
      {users === undefined ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Aucun utilisateur enregistré pour l'instant.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">Rôle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar size="sm">
                      {u.image && <AvatarImage src={u.image} alt={u.name} />}
                      <AvatarFallback>{userInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.name}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={async (v) => {
                      try {
                        await setRole({
                          id: u._id as Id<"app_users">,
                          role: v as RoleKey,
                        });
                        toast.success("Rôle mis à jour.");
                      } catch {
                        toast.error("Échec de la mise à jour.");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function RolePermissionsSection() {
  const perms = useQuery(api.access.listRolePermissions, {});
  const setRolePage = useMutation(api.users.setRolePage);

  const pagesForRole = (role: RoleKey): PageKey[] => {
    const row = perms?.find((p) => p.role === role);
    return (row?.pages as PageKey[]) ?? DEFAULT_ROLE_PAGES[role];
  };

  // Bascule d'UNE page : le serveur applique le delta sur l'état courant,
  // ce qui évite les pertes de mise à jour lors de bascules rapides.
  const toggle = async (role: RoleKey, page: PageKey, checked: boolean) => {
    try {
      await setRolePage({ role, page, enabled: checked });
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Pages autorisées par rôle</h2>
        <p className="text-xs text-muted-foreground">
          Cochez les pages accessibles pour chaque rôle.
        </p>
      </div>
      {perms === undefined ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rôle</TableHead>
              {PAGES.map((p) => (
                <TableHead key={p.id} className="text-center">
                  {p.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((r) => {
              const allowed = new Set(pagesForRole(r.id));
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  {PAGES.map((p) => (
                    <TableCell key={p.id} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={allowed.has(p.id)}
                          disabled={r.id === "admin"}
                          onCheckedChange={(checked) =>
                            void toggle(r.id, p.id, checked === true)
                          }
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
