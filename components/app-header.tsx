"use client"

import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { LogOut } from "lucide-react"

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-black px-4 py-3 text-white">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Image src="/logo.png" alt="BAROVÁ inventúra" width={120} height={40} className="h-8 w-auto" priority />

        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-white/50">API ID</span>
              <span className="font-semibold">{user?.userId}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/50">ID inventúry</span>
              <span className="font-semibold">{user?.invId}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2e2e38] text-white/60 hover:bg-[#3a3a44] hover:text-white"
            aria-label="Odhlásiť sa"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
