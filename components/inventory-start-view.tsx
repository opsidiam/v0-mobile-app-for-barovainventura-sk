"use client"

import { useAuth } from "@/lib/auth-context"
import { LogOut } from "lucide-react"

interface InventoryStartViewProps {
  onStartScanning: () => void
}

export function InventoryStartView({ onStartScanning }: InventoryStartViewProps) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col bg-black px-4 py-6">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="rounded-lg bg-[#1a1a1a] p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Novinky a aktuality</h3>
          <p className="text-sm text-white/60">
            {user?.newsMessage ||
              "Integer mauris sem, convallis ut, consequat in, sollicitudin sed, leo. Cras purus elit, hendrerit ut, egestas eget, sagittis at, nulla."}
          </p>
        </div>

        <button
          onClick={onStartScanning}
          className="h-14 w-full rounded-lg bg-[#2e2e38] font-semibold text-white transition-colors hover:bg-[#3a3a44]"
        >
          Začať inventúru
        </button>

        {/* Odhlásenie */}
        <button
          onClick={() => logout()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#3a3a44] text-white/70 transition-colors hover:bg-[#1a1a1a]"
        >
          <LogOut className="h-4 w-4" />
          Odhlásiť sa
        </button>
      </div>
    </div>
  )
}
