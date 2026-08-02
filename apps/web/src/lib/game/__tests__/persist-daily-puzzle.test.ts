jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/ai/learning/answer-registry", () => ({
  isAnswerRegistered: jest.fn(),
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
}));
jest.mock("@/db", () => ({
  db: {
    puzzleOps: {
      findByDate: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { submitCandidate: jest.fn() },
}));

import { isAnswerRegistered } from "@/ai/learning/answer-registry";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { db } from "@/db";
import { type PersistDailyPuzzleInput, persistDailyPuzzle } from "../persist-daily-puzzle";

const input: PersistDailyPuzzleInput = {
  dateString: "2026-08-01",
  puzzleDisplay: "🔥 + 🚚",
  puzzleType: "rebus",
  answer: "firetruck",
  difficulty: 4,
  category: "compound_words",
  explanation: "Fire plus truck gives firetruck.",
  hints: ["Read left to right", "Name both pictures", "Join the words"],
  aiGenerated: false,
  rebusPuzzle: "🔥 + 🚚",
};

const findByDate = jest.mocked(db.puzzleOps.findByDate);
const create = jest.mocked(db.puzzleOps.create);
const answerRegistered = jest.mocked(isAnswerRegistered);
const submitPlaytestCandidate = jest.mocked(puzzlePlaytestService.submitCandidate);

describe("daily puzzle publication locks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findByDate.mockResolvedValue(null);
    answerRegistered.mockResolvedValue({ taken: false });
    create.mockImplementation(async (puzzle) => puzzle as never);
  });

  it("refuses every duplicate answer without an emergency bypass", async () => {
    answerRegistered.mockResolvedValue({ taken: true, puzzleId: "archived-puzzle" });

    await expect(persistDailyPuzzle(input)).rejects.toThrow("Refusing to persist duplicate answer");
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed when the answer archive cannot be checked", async () => {
    answerRegistered.mockRejectedValue(new Error("archive offline"));

    await expect(persistDailyPuzzle(input)).rejects.toThrow("archive offline");
    expect(create).not.toHaveBeenCalled();
  });

  it("writes immutable answer and daily-publication lock keys", async () => {
    await persistDailyPuzzle({
      ...input,
      metadataExtra: {
        answerKey: "attempted-override",
        uniquenessContract: "attempted-override",
        dailyPublicationKey: "1900-01-01",
      },
    });

    const saved = create.mock.calls[0]?.[0];
    expect(saved?.metadata?.answerKey).toBe("firetruck");
    expect(saved?.metadata?.uniquenessContract).toBe("archive-v1");
    expect(saved?.metadata?.dailyPublicationKey).toBe("2026-08-01");
  });

  it("returns the winning row when concurrent publication hits the date lock", async () => {
    findByDate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "concurrent-winner" } as never);
    create.mockRejectedValue({ code: 11_000 });

    await expect(persistDailyPuzzle(input)).resolves.toEqual({
      id: "concurrent-winner",
      alreadyExisted: true,
    });
  });

  it("surfaces an answer-key race when no same-date winner exists", async () => {
    findByDate.mockResolvedValue(null);
    create.mockRejectedValue({ code: 11_000 });

    await expect(persistDailyPuzzle(input)).rejects.toThrow(
      "Concurrent publication used this answer"
    );
  });

  it("queues real AI-generated rebus boards for shadow human playtesting", async () => {
    const visual = {
      styleId: "ink-pictogram-v1" as const,
      mode: "composed" as const,
      layout: "row" as const,
      unicodeFallback: "SUN + FLOWER",
      layers: [
        { kind: "text" as const, content: "SUN", emphasis: "normal" as const },
        { kind: "operator" as const, symbol: "+" },
        { kind: "text" as const, content: "FLOWER", emphasis: "normal" as const },
      ],
    };
    await persistDailyPuzzle({
      ...input,
      aiGenerated: true,
      visual,
      metadataExtra: {
        techniqueId: "simple_compound",
        difficultyLevel: "Hard",
        generationMethod: "apex-tournament",
        estimatedSolveRate: 0.78,
      },
    });

    expect(submitPlaytestCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: "firetruck",
        visual,
        difficultyScore: 4,
        techniqueId: "simple_compound",
        automatedEstimatedSolveRate: 0.78,
      })
    );
  });

  it("does not fail publication when the shadow playtest queue is unavailable", async () => {
    submitPlaytestCandidate.mockRejectedValueOnce(new Error("playtest database offline"));

    await expect(
      persistDailyPuzzle({
        ...input,
        aiGenerated: true,
        visual: {
          styleId: "ink-pictogram-v1",
          mode: "composed",
          layout: "row",
          unicodeFallback: "FIRE + TRUCK",
          layers: [{ kind: "text", content: "FIRE", emphasis: "normal" }],
        },
      })
    ).resolves.toEqual(expect.objectContaining({ alreadyExisted: false }));
  });
});
