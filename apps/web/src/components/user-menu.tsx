"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import {
  Avatar,
  AvatarFallback,
} from "@CRM-APP/ui/components/avatar";
import { Button } from "@CRM-APP/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@CRM-APP/ui/components/dropdown-menu";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const user = useQuery(api.auth.getCurrentUser);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {user?.name ?? "…"}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" className="w-56 bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.replace("/");
                  },
                },
              });
            }}
          >
            <LogOut data-icon="inline-start" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
