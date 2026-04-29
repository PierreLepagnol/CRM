# Code Quality Assessment

> Revised: 2026-04-29  
> Scope: `apps/web/src/` + `packages/backend/convex/`

---

## Current Scores

| Dimension        | Score | Gap to 98 |
|------------------|-------|-----------|
| Usefulness       | 94    | −4        |
| Simplicity       | 88    | −10       |
| Maintainability  | 91    | −7        |
| Extensibility    | 93    | −5        |
| **Average**      | **91.5** | **−6.5** |

---

## Detailed Findings

### Usefulness — 94/100

**What works well**
- Pipeline kanban with drag-and-drop reorder ✓
- Contact detail: inline edit, interactions history, relance alerts ✓
- Projects: kanban + list toggle, inline sheet editor ✓
- CSV export with correct `;` separator + BOM for French Excel ✓
- Dark mode, responsive sidebar, mobile nav via Sheet ✓

**Deductions**
| Issue | −pts |
|-------|------|
| No search or CSV export for projects | −3 |
| Delete confirmation uses `window.confirm()` — blocks UI, ignores app theme, inaccessible | −3 |

---

### Simplicity — 88/100

**What works well**
- `kanban.tsx` extracts `useDndKanban`, `KanbanColumn`, `SortableItem`, `KanbanSkeleton` — shared across both entities ✓
- `lib/crm.ts` is the single source for STAGES, STATUTS, INTERACTION_TYPES ✓
- `formatDate` and `downloadCsv` utilities used consistently ✓

**Deductions**
| Issue | Location | −pts |
|-------|----------|------|
| `contacts/[id]/page.tsx` has 14 `useState` calls for a single form + interaction sub-form | line 58–72 | −3 |
| `ProjectSheet` (edit form) is inline in `project-kanban.tsx` making that file 311 lines | `project-kanban.tsx` | −3 |
| `contacts/page.tsx` imports `STAGES` (the array) but only uses `stageLabel`/`stageBadgeClass` helpers | line 16 | −1 |
| `hooks/use-mobile.ts` is defined but never imported anywhere in the app | `use-mobile.ts` | −2 |
| `KanbanBoard` wraps its JSX in a redundant `<>…</>` fragment | `kanban.tsx:106` | −1 |
| `layout.tsx` imports `Geist` + `Geist_Mono` from Next/Google fonts but their CSS variables are never applied — only `inter.variable` reaches `<html>` | `layout.tsx:3–9` | −2 |

---

### Maintainability — 91/100

**What works well**
- All stage/status labels in one place: label changes touch one file ✓
- Date formatting unified via `formatDate` ✓
- Backend: validators cleanly separated in `lib/validators.ts` ✓

**Deductions**
| Issue | Location | −pts |
|-------|----------|------|
| `contactFields` and `contactPatchFields` define the same 10 fields twice — one with `v.string()`, one with `v.optional(v.string())`. Adding a contact field requires updating both. | `contacts.ts:94–120` | −3 |
| `window.confirm()` for delete: no toast integration, no undo, impossible to add "undo" behaviour later without touching every caller | 2 files | −2 |
| `useIsMobile` hook is orphaned — creates a false impression of a mobile detection system | `use-mobile.ts` | −2 |
| `layout.tsx` font wiring inconsistency will confuse anyone trying to change typography | `layout.tsx` | −2 |

---

### Extensibility — 93/100

**What works well**
- `useDndKanban<TCol, TItem>` is generic — a third kanban entity needs ~80 LOC vs. the old ~250 ✓
- `crm.ts` lookup helpers decouple display from data everywhere ✓
- Backend mutation pattern (patch object, `updated_at`, soft delete) is consistent across all tables ✓

**Deductions**
| Issue | −pts |
|-------|------|
| `ProjectSheet` lives inside `project-kanban.tsx` — cannot reuse the project edit form elsewhere without copy-paste | −3 |
| Delete confirmation is `window.confirm()` in each caller — adding a richer "confirm with undo" pattern means touching every delete handler | −2 |
| `useAllStages` and `useAllStatuts` hooks are repeated per entity file — adding a new entity requires writing this boilerplate again | −2 |

---

## Proposed Enhancements (path to 98/100)

### E1 — Remove orphaned `useIsMobile` hook  *(5 min)*
**Files:** `apps/web/src/hooks/use-mobile.ts`  
Delete the file. It is never imported; the sidebar's collapse/icon mode is handled by CSS `group-data-[collapsible=icon]` selectors.  
**Gain:** Simplicity +2, Maintainability +2

---

### E2 — Fix `layout.tsx` font setup  *(10 min)*
**Files:** `apps/web/src/app/layout.tsx`  
Remove the unused `Geist` and `Geist_Mono` imports — the app uses Inter (set in `globals.css` via `--font-sans: "Inter Variable"`). The Next.js `inter.variable` is already applied to `<html>`. The Geist variables sit unused on `<body>`.  
**Gain:** Simplicity +2, Maintainability +2

---

### E3 — Remove unused `STAGES` import from contacts list page  *(2 min)*
**Files:** `apps/web/src/app/contacts/page.tsx`  
Replace `import { STAGES, stageLabel, stageBadgeClass }` with `import { stageLabel, stageBadgeClass }`. The array itself is not iterated on this page.  
**Gain:** Simplicity +1

---

### E4 — Remove fragment wrapper from `KanbanBoard`  *(2 min)*
**Files:** `apps/web/src/components/kanban.tsx`  
The `KanbanBoard` component returns `<>...</>` with a single `DndContext` child. Return the `DndContext` directly.  
**Gain:** Simplicity +1

---

### E5 — Extract `ProjectSheet` to its own file  *(15 min)*
**Files:** `apps/web/src/components/project-kanban.tsx` → split out `apps/web/src/components/project-sheet.tsx`  
`ProjectSheet` is a standalone controlled component (takes `projectId` + `onClose`). Extracting it keeps `project-kanban.tsx` focused on layout/DnD and makes the form reusable from the list view.  
**Gain:** Simplicity +3, Extensibility +3

---

### E6 — Replace `window.confirm()` with inline confirmation state  *(20 min)*
**Files:** `contacts/[id]/page.tsx`, `project-kanban.tsx` (ProjectSheet)  
Replace `if (!confirm("…")) return` with a two-step delete button: first click shows a `variant="destructive"` confirmation state ("Confirmer ?"), second click executes. No external dependency, no modal overhead, same UX pattern as GitHub's inline destructive actions.  

```tsx
// pattern
const [confirmDelete, setConfirmDelete] = useState(false);

<Button
  variant={confirmDelete ? "destructive" : "ghost"}
  size="sm"
  onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
  onBlur={() => setConfirmDelete(false)}
>
  {confirmDelete ? "Confirmer ?" : <Trash2 className="size-4" />}
</Button>
```
**Gain:** Usefulness +3, Maintainability +2, Extensibility +2

---

### E7 — Derive `contactPatchFields` from `contactFields` in backend  *(10 min)*
**Files:** `packages/backend/convex/contacts.ts`  
Convex validators are objects — `v.optional()` can be applied per-key:
```ts
import { v } from "convex/values";

const contactBaseFields = {
  prenom: v.string(),
  nom: v.string(),
  entreprise: v.optional(v.string()),
  // ... shared optional fields
} as const;

// create args: required fields non-optional
const contactPatchFields = {
  prenom: v.optional(v.string()),
  nom: v.optional(v.string()),
  // ... all optional
};
```
The cleanest approach: keep the two definitions but collapse the 10-field duplication by extracting the optional fields (which are identical in both) into a shared `sharedOptionalFields` object. Required fields (`prenom`, `nom`) stay explicit.  
**Gain:** Maintainability +3

---

### E8 — Add missing form labels for accessibility  *(10 min)*
**Files:** `contacts/[id]/page.tsx`  
Two inputs lack proper `Label` associations:
- The relance `<Input type="date">` has no `<Label htmlFor>` 
- The "Stage pipeline" `<Select>` section uses a `<h2>` instead of a `<Label>` — the trigger has no `id`  

**Gain:** Usefulness +1, cross-cutting accessibility improvement

---

## Score Projection After Enhancements

| Dimension       | Current | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | **Projected** |
|-----------------|---------|----|----|----|----|----|----|----|----|---------------|
| Usefulness      | 94      |    |    |    |    |    | +3 |    | +1 | **98**        |
| Simplicity      | 88      | +2 | +2 | +1 | +1 | +3 |    |    |    | **97→98**     |
| Maintainability | 91      | +2 | +2 |    |    |    | +2 | +3 |    | **100→98**    |
| Extensibility   | 93      |    |    |    |    | +3 | +2 |    |    | **98**        |
| **Average**     | **91.5**|    |    |    |    |    |    |    |    | **~98**       |

> Maintainability projects to 100 — in practice capped at 98 to reflect the inherent Convex limitation of per-entity `useAllX` hooks (E2-equivalent cannot be generalized due to React hook rules).
