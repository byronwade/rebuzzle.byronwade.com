jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/ugc/require-studio-user", () => ({ requireStudioUser: jest.fn() }));
jest.mock("@/lib/ugc/studio-ai-quota", () => ({
  consumeStudioAiGeneration: jest.fn(),
  refundStudioAiGeneration: jest.fn(),
  getStudioAiQuota: jest.fn(),
}));
jest.mock("@/ai/puzzle-agent/run-generation", () => ({ runPuzzleAgentGeneration: jest.fn() }));
jest.mock("@/ai/puzzle-agent/apex/rendered-qualification", () => ({
  qualifyRenderedCandidate: jest.fn(),
}));

import { qualifyRenderedCandidate } from "@/ai/puzzle-agent/apex/rendered-qualification";
import type { ApexCandidate } from "@/ai/puzzle-agent/apex/types";
import { runPuzzleAgentGeneration } from "@/ai/puzzle-agent/run-generation";
import type { PuzzleAgentResult } from "@/ai/puzzle-agent/schemas";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import {
  consumeStudioAiGeneration,
  getStudioAiQuota,
  refundStudioAiGeneration,
} from "@/lib/ugc/studio-ai-quota";
import { POST } from "../route";

const mockAuth = getAuthenticatedUser as jest.Mock;
const mockStudioGate = requireStudioUser as jest.Mock;
const mockConsume = consumeStudioAiGeneration as jest.Mock;
const mockRefund = refundStudioAiGeneration as jest.Mock;
const mockGetQuota = getStudioAiQuota as jest.Mock;
const mockGenerate = runPuzzleAgentGeneration as jest.Mock;
const mockQualify = qualifyRenderedCandidate as jest.Mock;
let ipSequence = 1;

function generationResult(answer = "one way or another") {
  return {
    puzzle: {
      rebusPuzzle: "ONE over door",
      answer,
      difficulty: 7,
      difficultyLevel: "Evil",
      explanation: "The word one is placed above a door, showing one way.",
      category: "phrases",
      hints: ["Look at placement.", "Read the pieces together.", "It is a familiar phrase."],
      techniqueId: "positional_phrase",
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "stack",
        unicodeFallback: "ONE\ndoor",
        layers: [{ kind: "text", content: "ONE", emphasis: "large" }],
      },
    },
    metadata: {
      fingerprint: `private-${answer}`,
      uniquenessScore: 91,
      calibratedDifficulty: 7,
      qualityScore: 94,
      qualityVerdict: "good",
      funScore: 88,
    },
    status: "success",
    recommendations: [],
  } as unknown as PuzzleAgentResult;
}

function request(body: unknown, ip = `198.51.100.${ipSequence++}`) {
  return new Request("https://rebuzzle.test/api/studio/puzzles/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function validInput(overrides: Record<string, unknown> = {}) {
  return { prompt: "Time and motion", answer: "one way or another", difficulty: 7, ...overrides };
}

describe("POST /api/studio/puzzles/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "creator-1" });
    mockStudioGate.mockResolvedValue({ ok: true, user: { userId: "creator-1" } });
    mockConsume.mockResolvedValue({ used: 1, limit: 3, remaining: 2 });
    mockRefund.mockResolvedValue(undefined);
    mockGetQuota.mockResolvedValue({ used: 0, limit: 3, remaining: 3 });
    mockGenerate.mockResolvedValue(generationResult());
    mockQualify.mockImplementation(async (candidate: ApexCandidate) => ({
      ...candidate,
      publishable: true,
      rejectReasons: [],
    }));
  });

  it("requires authentication before Studio access, quota, or generation", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(request(validInput()));

    expect(response.status).toBe(401);
    expect(mockStudioGate).not.toHaveBeenCalled();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("requires Studio entitlement before quota or generation", async () => {
    mockStudioGate.mockResolvedValue({ ok: false, status: 403, error: "Studio access required" });

    const response = await POST(request(validInput()));

    expect(response.status).toBe(403);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("rejects malformed, oversized, and out-of-range inputs before reserving quota", async () => {
    const malformed = await POST(
      new Request("https://rebuzzle.test/api/studio/puzzles/generate", {
        method: "POST",
        headers: { "x-forwarded-for": `198.51.100.${ipSequence++}` },
        body: "{invalid",
      })
    );
    const oversized = await POST(
      new Request("https://rebuzzle.test/api/studio/puzzles/generate", {
        method: "POST",
        headers: {
          "content-length": "4097",
          "x-forwarded-for": `198.51.100.${ipSequence++}`,
        },
        body: "{}",
      })
    );
    const invalidDifficulty = await POST(request(validInput({ difficulty: 11 })));
    const oversizedPrompt = await POST(request(validInput({ prompt: "t".repeat(181) })));
    const oversizedAnswer = await POST(request(validInput({ answer: "a".repeat(81) })));

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(invalidDifficulty.status).toBe(400);
    expect(oversizedPrompt.status).toBe(400);
    expect(oversizedAnswer.status).toBe(400);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("cancels an oversized streamed body even when Content-Length is absent", async () => {
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          if (pulls === 1) {
            controller.enqueue(new TextEncoder().encode("x".repeat(4097)));
          } else {
            controller.enqueue(new TextEncoder().encode("remaining body"));
            controller.close();
          }
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 }
    );
    const oversized = new Request("https://rebuzzle.test/api/studio/puzzles/generate", {
      method: "POST",
      headers: { "x-forwarded-for": `198.51.100.${ipSequence++}` },
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(cancelled).toBe(true);
    expect(pulls).toBe(1);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 403 when the shared Studio AI quota is exhausted", async () => {
    mockConsume.mockResolvedValue(null);

    const response = await POST(request(validInput()));

    expect(response.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("generates and qualifies two sequential candidates while preserving the fixed answer", async () => {
    let active = 0;
    let maxActive = 0;
    mockGenerate.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return generationResult();
    });
    mockQualify
      .mockImplementationOnce(async (candidate: ApexCandidate) => ({
        ...candidate,
        publishable: true,
        rejectReasons: [],
      }))
      .mockImplementationOnce(async (candidate: ApexCandidate) => ({
        ...candidate,
        publishable: false,
        rejectReasons: ["Rendered objects need a closer look."],
      }));

    const response = await POST(request(validInput()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates).toHaveLength(2);
    expect(body.candidates[0].qualification.status).toBe("passed");
    expect(body.candidates[1].qualification.status).toBe("needs_review");
    expect(body.candidates[1].qualification.issues).toEqual([
      "Rendered objects need a closer look.",
    ]);
    expect(body.partial).toBe(false);
    expect(body.remaining).toBe(2);
    expect(maxActive).toBe(1);
    expect(mockGenerate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        targetDifficulty: 7,
        theme: "Time and motion",
        answerSeed: "one way or another",
        candidateIndex: 1,
        candidateCount: 2,
        maxAttempts: 1,
        deferRenderedEvaluation: true,
        toolSurface: "studio",
      })
    );
    expect(mockGenerate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ candidateIndex: 2, candidateCount: 2 })
    );
    expect(mockQualify).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(body)).not.toContain("private-one way or another");
    expect(JSON.stringify(body)).not.toContain("private reasoning");
  });

  it("returns one usable candidate when the second slot fails", async () => {
    mockGenerate
      .mockResolvedValueOnce(generationResult())
      .mockRejectedValueOnce(new Error("secret provider diagnostics"));

    const response = await POST(request(validInput()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates).toHaveLength(1);
    expect(body.partial).toBe(true);
    expect(body.notice).toMatch(/second idea/i);
    expect(JSON.stringify(body)).not.toContain("secret provider diagnostics");
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("labels a candidate pending when rendered qualification is unavailable", async () => {
    mockQualify.mockRejectedValue(new Error("secret vision provider detail"));

    const response = await POST(request(validInput()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates[0].qualification.status).toBe("pending");
    expect(body.candidates[0].qualification.issues[0]).toMatch(/review/i);
    expect(JSON.stringify(body)).not.toContain("secret vision provider detail");
  });

  it("refunds the reserved credit if no candidate could be created", async () => {
    mockGenerate.mockRejectedValue(new Error("secret provider failure"));

    const response = await POST(request(validInput()));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/change the topic/i);
    expect(JSON.stringify(body)).not.toContain("secret provider failure");
    expect(mockRefund).toHaveBeenCalledWith("creator-1");
    expect(mockGetQuota).toHaveBeenCalledWith("creator-1");
  });

  it("never returns a candidate that silently changed the fixed answer", async () => {
    mockGenerate.mockResolvedValue(generationResult("a different answer"));

    const response = await POST(request(validInput({ answer: "the locked answer" })));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/exact answer/i);
    expect(mockQualify).not.toHaveBeenCalled();
    expect(mockRefund).toHaveBeenCalledWith("creator-1");
  });

  it("limits repeated generation requests from one IP without spending another credit", async () => {
    const ip = "203.0.113.244";
    const first = await POST(request(validInput(), ip));
    const second = await POST(request(validInput(), ip));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockConsume).toHaveBeenCalledTimes(1);
  });
});
