"use client"

import { useAuth } from "@/lib/auth-context"
import { Check } from "lucide-react"

interface InventoryCompleteViewProps {
  onNewInventory: () => void
}

export function InventoryCompleteView({ onNewInventory }: InventoryCompleteViewProps) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-black px-4 py-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-[#22c55e]">
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white">
          Inventúra úspešne
          <br />
          dokončená
        </h2>

        <div className="space-y-1 text-sm text-white/60">
          <p>
            <span className="font-medium">API ID:</span> {user?.userId}
          </p>
          <p>
            <span className="font-medium">ID inventúry:</span> {user?.invId}
          </p>
        </div>

        {/* Logout button */}
        <button
          onClick={() => logout()}
          className="h-12 w-full rounded-lg bg-[#2e2e38] font-medium text-white transition-colors hover:bg-[#3a3a44]"
        >
          Odhlásiť sa
        </button>
      </div>
    </div>
  )
}
