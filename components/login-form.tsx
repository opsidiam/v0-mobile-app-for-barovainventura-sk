"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const { login } = useAuth()
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(userId, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prihlásenie zlyhalo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12">
      <div className="mb-12">
        <Image src="/logo.png" alt="BAROVÁ inventúra" width={200} height={60} className="h-14 w-auto" priority />
      </div>

      {/* Formulár */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="userId" className="text-sm text-white/70">
            API ID:
          </label>
          <input
            id="userId"
            type="text"
            placeholder="123 456"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            autoComplete="username"
            className="h-12 w-full rounded-lg bg-[#2e2e38] px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-white/70">
            Heslo:
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="zadajte heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 w-full rounded-lg bg-[#2e2e38] px-4 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="h-12 w-full rounded-lg bg-[#3a3a44] font-medium text-white transition-colors hover:bg-[#4a4a54] disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Prihlasujem...
            </span>
          ) : (
            "Prihlásiť sa"
          )}
        </button>

        {/* Info text */}
        <p className="pt-2 text-center text-xs text-white/50">
          Prihlasovacie údaje sú jednorázové!
          <br />V prípade potreby kontaktujte svojho administrátora
        </p>
      </form>
    </div>
  )
}
