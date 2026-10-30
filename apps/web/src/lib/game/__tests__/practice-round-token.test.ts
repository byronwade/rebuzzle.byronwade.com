import { createPracticeRoundToken, verifyPracticeRoundToken } from "../practice-round-token";

const previousSecret = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousSecret;
});

it("signs a short-lived round token bound to the authenticated player and puzzle", async () => {
  const token = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 2,
  });

  await expect(verifyPracticeRoundToken(token, "player-1", "puzzle-1")).resolves.toMatchObject({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 2,
    roundId: expect.any(String),
    expiresAt: expect.any(Date),
  });
  await expect(verifyPracticeRoundToken(token, "player-2", "puzzle-1")).resolves.toBeNull();
  await expect(verifyPracticeRoundToken(token, "player-1", "puzzle-2")).resolves.toBeNull();
});

it("gives each round a distinct ID and preserves an ID across its token chain", async () => {
  const firstRoundToken = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 1,
  });
  const firstRound = await verifyPracticeRoundToken(firstRoundToken, "player-1", "puzzle-1");
  if (!firstRound) throw new Error("Expected a valid first-round token");

  const nextToken = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 2,
    roundId: firstRound.roundId,
  });
  const nextRound = await verifyPracticeRoundToken(nextToken, "player-1", "puzzle-1");
  const separateToken = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 1,
  });
  const separateRound = await verifyPracticeRoundToken(separateToken, "player-1", "puzzle-1");

  expect(nextRound?.roundId).toBe(firstRound.roundId);
  expect(separateRound?.roundId).not.toBe(firstRound.roundId);
});

it("rejects malformed, forged, and expired round tokens", async () => {
  await expect(verifyPracticeRoundToken("not-a-jwt", "player-1", "puzzle-1")).resolves.toBeNull();

  const token = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 1,
  });
  const [header, payload, signature] = token.split(".");
  const forged = `${header}.${Buffer.from(
    JSON.stringify({
      purpose: "practice-round",
      sub: "player-1",
      puzzleId: "puzzle-1",
      wrongGuessCount: 3,
    })
  ).toString("base64url")}.${signature}`;
  await expect(verifyPracticeRoundToken(forged, "player-1", "puzzle-1")).resolves.toBeNull();

  jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  const expiring = await createPracticeRoundToken({
    userId: "player-1",
    puzzleId: "puzzle-1",
    wrongGuessCount: 1,
  });
  jest.advanceTimersByTime(25 * 60 * 60 * 1000);
  await expect(verifyPracticeRoundToken(expiring, "player-1", "puzzle-1")).resolves.toBeNull();
  jest.useRealTimers();
});

it("only issues counts from zero through three", async () => {
  await expect(
    createPracticeRoundToken({ userId: "p", puzzleId: "q", wrongGuessCount: -1 })
  ).rejects.toThrow();
  await expect(
    createPracticeRoundToken({ userId: "p", puzzleId: "q", wrongGuessCount: 4 })
  ).rejects.toThrow();
});
