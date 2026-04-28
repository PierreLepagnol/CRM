import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { CalendarDays } from "lucide-react";

import { formatDate, formatMontant, ownerColor } from "@/lib/format";
import { TagChips } from "@/components/tag-picker";

type DealCardProps = {
  deal: Doc<"deals">;
};

export function DealCard({ deal }: DealCardProps) {
  return (
    <article className="rounded-md border bg-background p-3 text-sm shadow-xs transition hover:border-foreground/20 hover:shadow-sm">
      <div className="line-clamp-2 font-medium">{deal.titre}</div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatMontant(deal.montant, deal.devise)}
        </span>
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: ownerColor(deal.owner_id) }}
          title={`Owner : ${deal.owner_id}`}
          aria-label={`Owner ${deal.owner_id}`}
        />
      </div>

      {deal.date_closing_prevue ? (
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          {formatDate(deal.date_closing_prevue)}
        </div>
      ) : null}
      {deal.tags.length > 0 ? (
        <div className="mt-2">
          <TagChips ids={deal.tags} />
        </div>
      ) : null}
    </article>
  );
}
