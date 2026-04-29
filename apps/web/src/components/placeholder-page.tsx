import type { ReactNode } from "react";

import { AppShell } from "./app-shell";

type PlaceholderPageProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export function PlaceholderPage({
  title,
  description,
  icon,
}: PlaceholderPageProps) {
  return (
    <AppShell title={title}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        {icon ? (
          <div className="text-muted-foreground">{icon}</div>
        ) : null}
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ?? "Cette section arrive bientôt."}
        </p>
      </div>
    </AppShell>
  );
}
