/** Shared hard gates used by publication and evaluator benchmarks. */
export const BLIND_SOLVE_REQUIRED_VOTES = 2;
export const BLIND_SOLVE_DOMINANCE_MARGIN = 0.05;

/** A repeated response from the same model is retry evidence, not an independent vote. */
export function distinctJudgeResults<T extends { model: string }>(
  results: T[],
  scope: (result: T) => string = () => "global"
): T[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const model = result.model.trim().toLowerCase();
    if (!model) return false;
    const key = `${scope(result)}\u0000${model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
