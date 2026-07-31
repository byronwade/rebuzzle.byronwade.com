import { Suspense } from "react";
import { connection } from "next/server";
import Layout from "@/components/Layout";
import { fetchGameOverSolution } from "@/app/actions/gameActions";
import GameOverClient from "./game-over-client";

function GameOverFallback() {
  return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    </Layout>
  );
}

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
    <Suspense fallback={<GameOverFallback />}>
      <GameOverContent searchParams={searchParams} />
    </Suspense>
  );
}
