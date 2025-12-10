"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import { getMissingProducts, type Product } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface MissingProductsViewProps {
  onBack: () => void
  onManualAddProduct: (ean: string) => void
}

export function MissingProductsView({ onBack, onManualAddProduct }: MissingProductsViewProps) {
  const { token } = useAuth()
  const [missingProducts, setMissingProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMissingProducts = async () => {
      if (!token) return

      try {
        const missing = await getMissingProducts(token)
        setMissingProducts(Array.isArray(missing) ? missing : [])
      } catch (error) {
        console.error("Failed to fetch missing products:", error)
        setMissingProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchMissingProducts()
    const interval = setInterval(fetchMissingProducts, 5000)
    return () => clearInterval(interval)
  }, [token])

  const handleAddProduct = (ean: string) => {
    onManualAddProduct(ean)
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

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Nenaskenované produkty
            {missingProducts.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {missingProducts.length}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="rounded-lg bg-[#1a1a1a] p-8 text-center">
            <p className="text-white/50">Načítavam...</p>
          </div>
        ) : missingProducts.length === 0 ? (
          <div className="rounded-lg bg-[#1a1a1a] p-8 text-center">
            <p className="text-white/50">Všetky produkty boli naskenované</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missingProducts.map((product) => (
              <div key={product.ean} className="rounded-lg bg-[#1a1a1a] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                    <p className="text-xs text-white/40">{product.ean}</p>
                  </div>
                  <button
                    onClick={() => product.ean && handleAddProduct(product.ean)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2e2e38] text-white transition-colors hover:bg-[#3a3a44]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
