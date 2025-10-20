import { NextResponse } from "next/server";
import { createOrUpdateUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, email } = await request.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: "Username and email are required" },
        { status: 400 }
      );
    }

    // Generate a mock user ID for development
    const userId = `user_${Date.now()}`;

    // Create or update user in database
    const success = await createOrUpdateUser({
      id: userId,
      username,
      email,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: userId,
        username,
        email,
      },
      success: true,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
