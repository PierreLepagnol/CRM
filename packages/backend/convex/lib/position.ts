/**
 * Indexation fractionnaire des positions kanban (pattern « fractional indexing »,
 * cf. Figma/LexoRank). Un déplacement écrit UNE seule position — la moyenne des
 * voisins — au lieu de réindexer toute la colonne (O(1) au lieu de O(n), pas de
 * contention OCC entre déplacements concurrents). Logique pure → testable sans
 * Convex. Utilisée par `contacts.moveToStage` et `projects.moveToStatut`.
 */

/** Écart minimal avant de perdre en précision flottante et de devoir rééquilibrer. */
export const MIN_GAP = 1e-6;

/**
 * Position à insérer entre deux voisins triés par position croissante.
 * - début de colonne (`before` absent) : `after - 1`
 * - fin de colonne (`after` absent)     : `before + 1`
 * - liste vide (les deux absents)       : `0`
 * - entre deux voisins                  : la moyenne
 */
export function positionBetween(
  before: number | undefined,
  after: number | undefined,
): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return (after as number) - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

/**
 * Vrai si l'insertion à `index` parmi des voisins (déjà triés, l'élément déplacé
 * exclu) produirait un écart trop petit : il faut alors rééquilibrer la colonne.
 */
export function needsRebalance(sortedPositions: number[], index: number): boolean {
  const before = index > 0 ? sortedPositions[index - 1] : undefined;
  const after = index < sortedPositions.length ? sortedPositions[index] : undefined;
  if (before === undefined || after === undefined) return false;
  return after - before < MIN_GAP;
}

/**
 * Décrit comment appliquer un déplacement à l'index cible parmi `others` (les
 * autres items de la colonne, triés par position croissante, l'item déplacé
 * exclu). Renvoie soit une écriture unique (`single`), soit un rééquilibrage
 * complet (`rebalance`) quand les positions sont trop resserrées.
 */
export function planMove(
  others: { id: string; position: number }[],
  targetIndex: number,
):
  | { kind: "single"; position: number }
  | { kind: "rebalance"; positions: { id: string; position: number }[] } {
  const idx = Math.max(0, Math.min(targetIndex, others.length));
  const positions = others.map((o) => o.position);

  if (!needsRebalance(positions, idx)) {
    return {
      kind: "single",
      position: positionBetween(positions[idx - 1], positions[idx]),
    };
  }

  // Rééquilibrage : réindexe la colonne entière (0, 1, 2, …) en insérant l'item
  // déplacé à sa place. L'appelant écrit chaque ligne (rare, seulement quand les
  // positions ont convergé).
  const withGap = [...others];
  const rebalanced: { id: string; position: number }[] = [];
  let pos = 0;
  for (let i = 0; i <= withGap.length; i++) {
    if (i === idx) {
      rebalanced.push({ id: "__moved__", position: pos++ });
    }
    if (i < withGap.length) {
      rebalanced.push({ id: withGap[i].id, position: pos++ });
    }
  }
  return { kind: "rebalance", positions: rebalanced };
}

/**
 * Traduit un déplacement en liste d'écritures `{ id, patch }` — l'élément
 * déplacé reçoit sa nouvelle colonne + position, les autres (en cas de
 * rééquilibrage) seulement leur position. Pur/générique : partagé par
 * `contacts.moveToStage` et `projects.moveToStatut` (supprime les deux fonctions
 * jumelles). `columnField` = "stage" ou "statut".
 */
export function movesFromPlan(
  others: { id: string; position: number }[],
  targetIndex: number,
  movedId: string,
  columnField: string,
  columnValue: string,
  now: number,
): { id: string; patch: Record<string, unknown> }[] {
  const plan = planMove(others, targetIndex);
  if (plan.kind === "single") {
    return [
      { id: movedId, patch: { [columnField]: columnValue, position: plan.position, updated_at: now } },
    ];
  }
  return plan.positions.map((p) =>
    p.id === "__moved__"
      ? { id: movedId, patch: { [columnField]: columnValue, position: p.position, updated_at: now } }
      : { id: p.id, patch: { position: p.position, updated_at: now } },
  );
}
