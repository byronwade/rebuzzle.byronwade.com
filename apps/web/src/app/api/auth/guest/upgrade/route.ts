import { NextResponse } from "next/server";
import { db } from "@/db";
import { isValidEmail, normalizeEmail, validateUsername } from "@/lib/account-validation";
import { verifyUserCredentials } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { signToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { hashPassword } from "@/lib/password";

const guestEmailSuffix = "@guest.rebuzzle.local";

async function guestTokenResponse(user: { id: string; username: string; email: string }) {
  const token = await signToken({ userId: user.id, username: user.username, email: user.email });
  return NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, email: user.email, guest: false },
    token,
  });
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimiters.auth(request);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) },
      }
    );
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const user = await db.userOps.findById(auth.userId);
    if (!user) return NextResponse.json({ error: "Guest account not found" }, { status: 401 });

    // A member token must never be able to invoke the guest conversion path.
    // The original guest token remains usable only to recover a lost upgrade response.
    const isOriginalGuestToken = auth.email.endsWith(guestEmailSuffix);
    if (!isOriginalGuestToken) {
      return NextResponse.json({ error: "Only a guest account can be upgraded" }, { status: 403 });
    }

    let body: { username?: unknown; email?: unknown; password?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "A valid JSON body is required" }, { status: 400 });
    }
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!(username && email && password)) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }
    const usernameError = validateUsername(username);
    if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });
    if (!isValidEmail(email))
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!user.isGuest) {
      // The client may have missed the first successful response. Verify the
      // submitted credentials against the same upgraded user before reissuing.
      if (normalizeEmail(user.email) !== email) {
        return NextResponse.json(
          { error: "This guest was already upgraded. Sign in with that account to continue." },
          { status: 409 }
        );
      }
      const verified = await verifyUserCredentials(email, password);
      if (!verified.valid || verified.user?.id !== user.id) {
        return NextResponse.json(
          { error: "This guest was already upgraded. Sign in with that account to continue." },
          { status: 409 }
        );
      }
      return guestTokenResponse(user);
    }

    const existingUser = await db.userOps.findByEmail(email);
    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    if (await db.userOps.isUsernameTaken(username, user.id)) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    let convertedUser = await db.userOps.convertGuestToUser(user.id, {
      username,
      email,
      passwordHash,
    });

    if (!convertedUser) {
      // Another request may have converted this same row first. Treat it as a
      // successful retry only when credentials prove ownership of that row.
      const currentUser = await db.userOps.findById(user.id);
      if (!currentUser || currentUser.isGuest || normalizeEmail(currentUser.email) !== email) {
        return NextResponse.json(
          { error: "Guest account could not be upgraded. Please retry." },
          { status: 409 }
        );
      }
      const verified = await verifyUserCredentials(email, password);
      if (!verified.valid || verified.user?.id !== user.id) {
        return NextResponse.json(
          { error: "Guest account could not be upgraded. Please retry." },
          { status: 409 }
        );
      }
      convertedUser = currentUser;
    }

    return guestTokenResponse(convertedUser);
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "That email or username is already in use." },
        { status: 409 }
      );
    }
    console.error("Guest account upgrade failed:", error);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
