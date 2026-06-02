"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@CRM-APP/ui/components/sidebar";
import { FolderKanban, Kanban, Settings, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAccess, type PageKey } from "@/lib/use-access";
import UserMenu from "./user-menu";

const NAV = [
  { href: "/pipeline", label: "Pipeline", icon: Kanban, page: "pipeline" as PageKey },
  { href: "/contacts", label: "Contacts", icon: Users, page: "contacts" as PageKey },
  { href: "/projets", label: "Projets", icon: FolderKanban, page: "projets" as PageKey },
  { href: "/admin", label: "Administration", icon: Settings, page: "admin" as PageKey },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { can, me } = useAccess();
  // Tant que l'accès n'est pas chargé, on n'affiche rien pour éviter un flash.
  const items = me === null ? [] : NAV.filter((item) => can(item.page));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 ">
          <Image
            src="/LogoSCIAM-white.webp"
            alt="SCIAM"
            width={120}
            height={32}
            className=" h-8 w-auto group-data-[collapsible=icon]:hidden invert"
          />
          <Image
            src="/LogoSCIAM-white.webp"
            alt="SCIAM"
            width={32}
            height={32}
            className="hidden size-5 object-contain group-data-[collapsible=icon]:block invert"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={active}
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
