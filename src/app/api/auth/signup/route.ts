import { NextResponse } from "next/server"
import { createOrUpdateUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Generate a unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Create user in database
    const success = await createOrUpdateUser({
      id: userId,
      username,
      email,
    })

    if (!success) {
      return NextResponse.json(
        { error: "Failed to create account. Username or email may already exist." },
        { status: 500 }
      )
    }

    // In production, you'd hash the password and store it
    // For now, we'll just create the user profile

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
      },
      message: "Account created successfully!",
    })
  } catch (error) {
    console.error("Signup failed:", error)
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    )
  }
}
