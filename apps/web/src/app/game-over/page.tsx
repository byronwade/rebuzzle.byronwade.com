import { Suspense } from "react";
import Layout from "@/components/Layout";
import { fetchGameData } from "@/app/actions/gameActions";
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
  const params = await searchParams;
  const gameData = await fetchGameData();

  return (
    <GameOverClient
      gameData={{
        answer: gameData.answer,
        explanation: gameData.explanation,
        difficulty: gameData.difficulty,
        puzzleType: gameData.puzzleType,
        metadata: {
          puzzleType: gameData.puzzleType,
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
