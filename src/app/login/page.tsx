"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { LogIn, Mail, Lock, User } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: isLogin ? "Welcome back!" : "Account created!",
          description: isLogin
            ? "You've successfully logged in."
            : "Your account has been created successfully.",
        })

        // Redirect to home
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Auth error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestPlay = () => {
    // Set guest mode in localStorage
    localStorage.setItem("guestMode", "true")
    router.push("/")
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🧩</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? "Welcome Back!" : "Join Rebuzzle"}
            </h1>
            <p className="text-gray-600">
              {isLogin
                ? "Log in to track your progress and compete"
                : "Create an account to save your stats"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500">Must be at least 6 characters</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLogin ? "Log In" : "Sign Up"}
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
              OR
            </span>
          </div>

          {/* Guest Play */}
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGuestPlay}
          >
            Continue as Guest
          </Button>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </button>
          </div>

          {/* Benefits */}
          {!isLogin && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">
                Benefits of Creating an Account:
              </h3>
              <ul className="space-y-1 text-sm text-purple-800">
                <li>✓ Track your streak and statistics</li>
                <li>✓ Compete on the leaderboard</li>
                <li>✓ Earn achievements</li>
                <li>✓ Sync across devices</li>
                <li>✓ Get daily puzzle notifications</li>
              </ul>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Game
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
