import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KanbanSkeleton } from "./kanban";

/**
 * Le squelette kanban est présentationnel (pur props, sans Convex) : on vérifie
 * qu'il rend bien une colonne par entrée avec son libellé. Garde-fou contre une
 * régression de la grille d'attente affichée pendant le chargement.
 */
describe("KanbanSkeleton", () => {
  it("rend une colonne par entrée, avec le libellé", () => {
    const columns = [
      { id: "nouveau", label: "Prospect" },
      { id: "gagne", label: "Gagné" },
    ] as const;
    render(<KanbanSkeleton columns={columns} />);
    expect(screen.getByText("Prospect")).toBeInTheDocument();
    expect(screen.getByText("Gagné")).toBeInTheDocument();
  });

  it("ne rend aucune colonne pour une liste vide", () => {
    const { container } = render(<KanbanSkeleton columns={[]} />);
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });
});
