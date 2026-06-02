import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageGuard } from "./page-guard";

// Control the access hook directly so we test PageGuard's branching behavior.
const mockUseAccess = vi.fn();
vi.mock("@/lib/use-access", () => ({
  useAccess: () => mockUseAccess(),
}));

function setAccess(state: {
  can?: boolean;
  isLoading?: boolean;
  me?: unknown;
}) {
  mockUseAccess.mockReturnValue({
    can: () => state.can ?? false,
    isLoading: state.isLoading ?? false,
    me: "me" in state ? state.me : { role: "commercial" },
  });
}

describe("PageGuard", () => {
  it("shows a loading state (not a blank page) while access is resolving", () => {
    setAccess({ isLoading: true, me: null });
    render(
      <PageGuard pageKey="projets">
        <div>contenu secret</div>
      </PageGuard>,
    );
    expect(screen.getByTestId("page-guard-loading")).toBeInTheDocument();
    expect(screen.queryByText("contenu secret")).not.toBeInTheDocument();
  });

  it("denies access when the role lacks the page", () => {
    setAccess({ can: false, isLoading: false });
    render(
      <PageGuard pageKey="projets">
        <div>contenu secret</div>
      </PageGuard>,
    );
    expect(screen.getByText("Accès refusé")).toBeInTheDocument();
    expect(screen.queryByText("contenu secret")).not.toBeInTheDocument();
  });

  it("renders children when the role has the page", () => {
    setAccess({ can: true, isLoading: false });
    render(
      <PageGuard pageKey="projets">
        <div>contenu secret</div>
      </PageGuard>,
    );
    expect(screen.getByText("contenu secret")).toBeInTheDocument();
  });
});
