import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const ROUND_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const MAX_WRONG_GUESSES = 3;

export interface PracticeRoundTokenClaims {
  userId: string;
  puzzleId: string;
  wrongGuessCount: number;
  roundId?: string;
}

export interface VerifiedPracticeRoundTokenClaims {
  userId: string;
  puzzleId: string;
  wrongGuessCount: number;
  roundId: string;
  expiresAt: Date;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign practice round tokens");
  return secret;
}

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export async function createPracticeRoundToken(claims: PracticeRoundTokenClaims): Promise<string> {
  if (
    !claims.userId ||
    !claims.puzzleId ||
    !Number.isInteger(claims.wrongGuessCount) ||
    claims.wrongGuessCount < 0 ||
    claims.wrongGuessCount > MAX_WRONG_GUESSES ||
    (claims.roundId !== undefined &&
      (typeof claims.roundId !== "string" ||
        claims.roundId.length === 0 ||
        claims.roundId.length > 128))
  ) {
    throw new Error("Invalid practice round token claims");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    purpose: "practice-round",
    sub: claims.userId,
    puzzleId: claims.puzzleId,
    wrongGuessCount: claims.wrongGuessCount,
    roundId: claims.roundId ?? randomUUID(),
    iat: issuedAt,
    exp: issuedAt + ROUND_TOKEN_LIFETIME_SECONDS,
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, getSecret())}`;
}

export async function verifyPracticeRoundToken(
  token: unknown,
  userId: string,
  puzzleId: string
): Promise<VerifiedPracticeRoundTokenClaims | null> {
  if (typeof token !== "string" || token.length > 4096 || !userId || !puzzleId) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, suppliedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !suppliedSignature) return null;
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
      alg?: unknown;
      typ?: unknown;
    };
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      purpose?: unknown;
      sub?: unknown;
      puzzleId?: unknown;
      wrongGuessCount?: unknown;
      roundId?: unknown;
      iat?: unknown;
      exp?: unknown;
    };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const expectedSignature = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`, getSecret()));
    const actualSignature = Buffer.from(suppliedSignature);
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > now + 60 ||
      payload.exp <= now ||
      payload.exp - payload.iat > ROUND_TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }
    const wrongGuessCount = payload.wrongGuessCount;
    if (
      payload.purpose !== "practice-round" ||
      payload.sub !== userId ||
      payload.puzzleId !== puzzleId ||
      typeof payload.roundId !== "string" ||
      payload.roundId.length === 0 ||
      payload.roundId.length > 128 ||
      typeof wrongGuessCount !== "number" ||
      !Number.isInteger(wrongGuessCount) ||
      wrongGuessCount < 0 ||
      wrongGuessCount > MAX_WRONG_GUESSES
    ) {
      return null;
    }
    return {
      userId,
      puzzleId,
      wrongGuessCount,
      roundId: payload.roundId,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}
