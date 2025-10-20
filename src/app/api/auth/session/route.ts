import { NextResponse } from "next/server";
import { getUserWithStats, createOrUpdateUser } from "@/lib/auth";

export async function GET() {
  try {
    // For now, return a mock session for development
    // In production, this would integrate with Neon Auth
    const mockUser = {
      id: "user_123",
      username: "testuser",
      email: "test@example.com",
    };

    // Create or update user in database
    await createOrUpdateUser(mockUser);

    return NextResponse.json({
      user: mockUser,
      authenticated: true,
    });
  } catch (error) {
    console.error("Session check failed:", error);
    return NextResponse.json({
      user: null,
      authenticated: false,
    });
  }
}
