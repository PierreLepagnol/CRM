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
  SidebarSeparator,
} from "@CRM-APP/ui/components/sidebar";
import {
  Building2,
  CalendarCheck2,
  FileSignature,
  Flame,
  Kanban,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "./user-menu";

const NAV = [
  { href: "/aujourdhui", label: "Aujourd'hui", icon: Flame },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/societes", label: "Sociétés", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/reunions", label: "Réunions", icon: CalendarCheck2 },
  { href: "/contrats", label: "Contrats", icon: FileSignature },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Image
            src="/LogoSCIAM-white.webp"
            alt="SCIAM"
            width={120}
            height={32}
            className="h-8 w-auto group-data-[collapsible=icon]:hidden"
          />
          <Image
            src="/LogoSCIAM-white.webp"
            alt="SCIAM"
            width={32}
            height={32}
            className="hidden size-5 object-contain group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/reglages" />}
                  isActive={pathname.startsWith("/reglages")}
                  tooltip="Réglages"
                >
                  <Settings />
                  <span>Réglages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
