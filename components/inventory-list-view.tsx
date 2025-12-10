"use client"
import { ArrowLeft, X } from "lucide-react"
import type { ScannedProduct } from "./app-shell"
import { useAuth } from "@/lib/auth-context"

interface InventoryListViewProps {
  products: ScannedProduct[]
  onBack: () => void
  onRemoveProduct: (ean: string) => void
  onComplete: () => void
}

export function InventoryListView({ products, onBack, onRemoveProduct, onComplete }: InventoryListViewProps) {
  const { token } = useAuth()
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col bg-black px-4 py-4 min-h-screen">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-white/60">Nazad</span>
        </div>

        {products.length > 0 && (
          <button
            onClick={onComplete}
            className="h-12 w-full rounded-lg bg-[#2e2e38] font-medium text-white transition-colors hover:bg-[#3a3a44]"
          >
            Dokončiť inventúru
          </button>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prehľad inventúry</h2>
          <span className="text-sm text-white/50">{products.length} produktov</span>
        </div>

        {/* Product list */}
        {products.length === 0 ? (
          <div className="rounded-lg bg-[#1a1a1a] p-8 text-center">
            <p className="text-white/50">Zatiaľ neboli naskenované žiadne produkty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.ean} className="rounded-lg bg-[#1a1a1a] p-3">
                <div className="flex items-start gap-3">
                  {/* Product image placeholder */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#2e2e38]">
                    <span className="text-xl">🍾</span>
                  </div>

                  {/* Product info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                        {product.alcoholContent && product.alcoholContent !== "0" && (
                          <span className="text-xs text-white/50">{product.alcoholContent}%</span>
                        )}
                      </div>
                      <span className="text-xs text-white/40">{formatTime(product.scannedAt)}</span>
                    </div>
                    <p className="text-xs text-white/40">{product.ean}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {product.volume && <span className="text-white/50">{product.volume}</span>}
                        <span className="font-semibold text-white">{product.quantity}ks</span>
                      </div>
                      <button
                        onClick={() => onRemoveProduct(product.ean)}
                        className="flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
