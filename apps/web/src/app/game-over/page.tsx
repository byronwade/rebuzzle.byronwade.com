import { Suspense } from "react";
import { connection } from "next/server";
import { fetchGameOverSolution } from "@/app/actions/gameActions";
import { GameOverPageSkeleton } from "@/components/page-skeletons";
import GameOverClient from "./game-over-client";

async function GameOverContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const params = await searchParams;
  const solution = await fetchGameOverSolution();

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
