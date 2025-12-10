"use client"

import { useAuth, AuthProvider } from "@/lib/auth-context"
import { LoginForm } from "@/components/login-form"
import { AppShell } from "@/components/app-shell"
import { Loader2 } from "lucide-react"

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <AppShell />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
