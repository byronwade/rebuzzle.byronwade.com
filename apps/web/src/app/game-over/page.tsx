import { connection } from "next/server";
import { Suspense } from "react";
import { fetchGameOverSolution } from "@/app/actions/gameActions";
import { GameOverPageSkeleton } from "@/components/page-skeletons";
import GameOverClient from "./game-over-client";

async function GameOverContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Must await connection() before Date/cookie-dependent server actions.
  // Parallelizing it with fetchGameOverSolution() races prerender and fails the build.
  await connection();
  const [params, solution] = await Promise.all([searchParams, fetchGameOverSolution()]);

  return (
    <GameOverClient
      gameData={{
        answer: solution.answer,
        explanation: solution.explanation,
        difficulty: solution.difficulty,
        puzzleType: solution.puzzleType,
        locked: solution.locked,
        puzzleId: solution.puzzleId,
        metadata: {
          puzzleType: solution.puzzleType,
        },
      }}
      searchParams={params}
    />
  );
}

export default function GameOverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<GameOverPageSkeleton />}>
      <GameOverContent searchParams={searchParams} />
    </Suspense>
  );
}
