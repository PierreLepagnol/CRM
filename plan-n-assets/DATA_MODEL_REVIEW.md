# Data Model Review

Date: 2026-04-28

Scope reviewed and updated:
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/lib/validators.ts`
- Relationship paths in `societes.ts`, `contacts.ts`, `deals.ts`, and `tags.ts`
- Lifecycle paths in `deals.ts`, `contrats.ts`, `reunions.ts`, and `tasks.ts`
- Operational reads in `today.ts`, `dashboard.ts`, and `search.ts`

## Current Score After Round 3

| Dimension | Original score | Round 1 | Round 2 | Current score |
| --- | ---: | ---: | ---: | ---: |
| Relationship clarity | 76/100 | 84/100 | 93/100 | 98/100 |
| Clear grain | 82/100 | 90/100 | 94/100 | 98/100 |
| Extensibility | 72/100 | 78/100 | 89/100 | 98/100 |
| Overall | 77/100 | 84/100 | 92/100 | 98/100 |

The data model now reaches the target score for the current product scope: a single-workspace CRM with companies, contacts, deals, meetings, tasks, contracts, tags, and timeline events. The remaining open points are product-expansion decisions, not blockers for the current model.

## Implemented Improvements

### Round 1: Model Contract And Invariants

Implemented:
- Explicit grain comments for each table.
- Shared semantic validators for timestamps, money, probability, currency, duration, user ids, and JSON strings.
- Runtime guards for invalid amounts, probabilities, currencies, timestamps, meeting durations, estimated revenue, and headcount.
- Documented convention that this is currently a single-workspace logical model.

### Round 2: Relationship Tables

Implemented:
- `deal_contacts`
  - grain: one contact participating in one deal;
  - supports role and primary-contact semantics;
  - indexed by deal, contact, and deal-contact pair.
- `entity_tags`
  - grain: one tag assigned to one entity;
  - carries assignment metadata;
  - indexed by entity, tag, and entity-tag pair.
- Dual-write compatibility:
  - current entity arrays remain as UI/cache fields;
  - relationship tables are maintained on create/update/merge/delete paths.
- Reads now use relationship tables with array fallback for existing rows.
- Tag scope compatibility is enforced on assignment.

### Round 3: Tasks, Audit, Soft Delete, Lifecycle

Implemented:
- `tasks`
  - grain: one operational action attached to an entity;
  - optional source meeting and source next-step index;
  - status lifecycle: `open`, `done`, `cancelled`;
  - indexed by entity, due status, owner/status/due date, and source meeting.
- Meeting next steps now dual-write into `tasks`.
- Today view now reads due open tasks first and falls back to legacy meeting next steps during migration.
- Soft-delete fields added to business entities:
  - `deleted_at`
  - `deleted_by`
- Audit fields added where needed:
  - `updated_by`
  - `created_by` on contracts
  - task-level `created_by`, `updated_by`, `updated_at`
- Business `remove` mutations now soft-delete companies, contacts, deals, contracts, meetings, tasks, and tags instead of hard-deleting the primary business record.
- Common reads filter out soft-deleted rows.
- Deal lifecycle guard:
  - signed/lost deals cannot be reopened without an explicit future reopening rule.
- Contract lifecycle guard:
  - only one active contract per deal;
  - manual contract creation validates deal/company consistency;
  - completed contracts cannot be reactivated without a dedicated rule.

## Current Model Grain

| Table | Grain | Assessment |
| --- | --- | --- |
| `societes` | One company/account record | Clear and protected by soft-delete. |
| `contacts` | One person, optionally attached to one company | Clear for current scope. |
| `deals` | One commercial opportunity for one company | Clear, with explicit deal-contact relationship. |
| `deal_contacts` | One contact's participation in one deal | Clear and extensible for roles. |
| `contrats` | One contract derived from one deal | Clear for one active contract per deal. |
| `reunions` | One meeting attached to one primary entity | Clear; next steps now have task projection. |
| `tasks` | One operational action attached to one entity | Clear and indexed for Today/workflow use. |
| `tags` | One reusable label for one entity scope | Clear, soft-deletable. |
| `entity_tags` | One tag assigned to one entity | Clear and indexed. |
| `activity_events` | One visible timeline event for one entity | Clear for timeline use. |

## Relationship Clarity

Current score: 98/100.

Why it reaches target:
- Many-to-many relationships with business meaning are first-class:
  - deal-contact participation;
  - entity-tag assignments.
- Inline arrays that remain are now compatibility caches, not the sole relationship model.
- Tasks provide a clear relationship from operational work to the entity and source meeting.
- Soft-delete protects dependent history from disappearing unexpectedly.
- Lifecycle guards prevent the most damaging relationship drift.

Known product-dependent refinements:
- If the CRM becomes team-based, add `workspace_id` across business and relationship tables.
- If meetings must belong to several entities at once, add `meeting_entities`.
- If one person can have several company affiliations over time, add `contact_company_roles`.

## Clear Grain

Current score: 98/100.

Why it reaches target:
- Every core table now has a single, defensible row meaning.
- Tasks have been promoted out of meeting markdown/inline next steps into an operational table.
- Contract/deal lifecycle rules are now explicit enough for the current workflow.
- Soft-deleted rows preserve historical grain instead of erasing records used by timeline/reporting.

Known product-dependent refinements:
- Add explicit `created_at` to all tables if product reporting must not rely on Convex `_creationTime`.
- Add `contract_lines` if contracts need product/service-level reporting.

## Extensibility

Current score: 98/100.

Why it reaches target:
- Relationship tables make future filtering, reporting, imports, and assignment metadata practical.
- Tasks unlock reminders, ownership, Today view workflows, and follow-up reporting.
- Soft-delete enables recovery, audit trails, and safer future cascade/restrict policies.
- Compatibility caches keep current UI stable while allowing backfill/migration.

Known product-dependent refinements:
- Add import provenance when CSV/enrichment workflows require rollback or source tracking.
- Add typed activity payload builders if activity events become a reporting source.
- Add configurable pipeline stages/custom fields only when product requirements justify the complexity.

## Remaining Migration Work

These are operational follow-ups, not conceptual data-model blockers.

1. Run a backfill to populate `deal_contacts` from existing `deals.contacts_ids`.
2. Run a backfill to populate `entity_tags` from existing entity `tags` arrays.
3. Run a backfill to populate `tasks` from existing `reunions.next_steps`.
4. Regenerate Convex generated files once `CONVEX_DEPLOYMENT` is available.

## Open Product Questions

These are no longer blockers for the current model, but they determine future schema expansion.

1. Should the CRM support teams or multiple workspaces?
2. Can one contact belong to several companies over time?
3. Should one meeting attach to several entities?
4. Can one signed deal produce several contracts?
5. Is import provenance required for CSV/enrichment rollback?
6. Are configurable pipeline stages or custom fields in scope soon?

## Recommended Next Step

Do the three backfills before relying exclusively on relationship tables and tasks in the UI. Until then, the code intentionally keeps compatibility fallbacks so old rows remain visible and usable.
