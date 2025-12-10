"use client"

import { useAuth } from "@/lib/auth-context"

export function AppHeader() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-black px-4 py-3 text-white">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        {/* Logo - len text bez ikony */}
        <div className="flex flex-col">
          <span className="text-[10px] font-normal text-white/60">inventúra</span>
          <span className="text-base font-bold leading-none">BAROVÁ</span>
        </div>

        <div className="flex gap-6 text-xs">
          <div className="flex flex-col items-center">
            <span className="text-white/50">API ID</span>
            <span className="font-semibold">{user?.userId}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/50">ID inventúry</span>
            <span className="font-semibold">{user?.invId}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
