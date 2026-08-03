/**
 * Diversity memory — rotate techniques/categories and ban recent answers.
 */

import { getCollection } from "@/db/mongodb";
import { DIFFICULTY_LEVELS } from "../difficulty-levels";
import { normalizeAnswerKey, TECHNIQUE_IDS } from "../quality";
import type { DiversitySnapshot } from "./types";

type RecentDoc = {
  answer?: string;
  category?: string;
  puzzle?: string;
  rebusPuzzle?: string;
  metadata?: { techniqueId?: string; category?: string };
  difficulty?: string | number;
  createdAt?: Date;
};

function countBy(values: string[]): Array<{ id: string; count: number }> {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

/**
 * Snapshot recent catalog diversity for curriculum + seeding.
 */
export async function loadDiversitySnapshot(input?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<DiversitySnapshot> {
  const lookbackDays = input?.lookbackDays ?? 45;
  const limit = Math.min(input?.limit ?? 80, 150);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let docs: RecentDoc[] = [];
  try {
    docs = (await getCollection("puzzles")
      .find({ createdAt: { $gte: cutoff } })
      .project({
        answer: 1,
        category: 1,
        puzzle: 1,
        rebusPuzzle: 1,
        metadata: 1,
        difficulty: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as RecentDoc[];
  } catch {
    docs = [];
  }

  const recentAnswers = docs.flatMap((d) => {
    const answer = String(d.answer ?? "");
    return answer ? [answer] : [];
  });
  const techniques = docs.flatMap((d) => {
    const technique = String(d.metadata?.techniqueId ?? "");
    return technique ? [technique] : [];
  });
  const categories = docs.flatMap((d) => {
    const category = String(d.metadata?.category ?? d.category ?? "");
    return category ? [category] : [];
  });

  const recentTechniques = countBy(techniques);
  const recentCategories = countBy(categories);

  const allTierTechniques = new Set(DIFFICULTY_LEVELS.flatMap((l) => l.techniques));
  const usedRecently = new Set(
    recentTechniques.flatMap((t) => (t.count >= 2 ? [t.id] : []))
  );
  const overusedTechniques = recentTechniques.flatMap((t) => (t.count >= 3 ? [t.id] : []));

  const underusedTechniques = [...allTierTechniques].filter(
    (id) => !usedRecently.has(id) && TECHNIQUE_IDS.includes(id as never)
  );

  const bannedAnswerKeys = [
    ...new Set(recentAnswers.flatMap((a) => {
      const key = normalizeAnswerKey(a);
      return key ? [key] : [];
    })),
  ];

  return {
    recentAnswers: recentAnswers.slice(0, 40),
    recentTechniques,
    recentCategories,
    overusedTechniques,
    underusedTechniques: underusedTechniques.slice(0, 12),
    bannedAnswerKeys,
    lookbackDays,
  };
}
