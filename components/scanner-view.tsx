"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getProductByEan, updateProduct, type Product } from "@/lib/api"
import { AlertCircle, Camera, Check, Loader2, X, Plus, Minus, List } from "lucide-react"
import type { ScannedProduct } from "./app-shell"

interface ScannerViewProps {
  onProductScanned: (product: ScannedProduct) => void
  onViewList: () => void
  scannedCount: number
}

export function ScannerView({ onProductScanned, onViewList, scannedCount }: ScannerViewProps) {
  const { token } = useAuth()
  const [ean, setEan] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      setError("Nepodarilo sa spustiť kameru. Skontrolujte povolenia.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  const handleSearch = async () => {
    if (!ean.trim() || !token) return

    setIsLoading(true)
    setError(null)
    setProduct(null)
    setSaveSuccess(false)

    try {
      const result = await getProductByEan(token, ean.trim())

      if (result.product_found) {
        const foundProduct = Array.isArray(result.product_found) ? result.product_found[0] : result.product_found
        setProduct(foundProduct)
        setQuantity("")
        stopCamera() // Zastavíme kameru keď nájdeme produkt
      } else if (result.product_not_found) {
        setError(`Produkt s EAN ${ean} nebol nájdený v databáze.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vyhľadávanie zlyhalo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!token || !product || !quantity) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await updateProduct(token, {
        scan_id: product.scan_id,
        ean: ean.trim(),
        full_pack: quantity,
        type: product.selling_method === "rozlievane" ? 0 : 1,
      })

      onProductScanned({
        ean: ean.trim(),
        name: product.name,
        brand: product.brand,
        quantity: Number.parseInt(quantity, 10),
        volume: product.volume,
        alcoholContent: product.alcohol_content,
        scanId: response.scan_id || product.scan_id,
        scannedAt: new Date(),
      })

      setSaveSuccess(true)
      setTimeout(() => {
        setProduct(null)
        setEan("")
        setQuantity("")
        setSaveSuccess(false)
        inputRef.current?.focus()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uloženie zlyhalo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setEan("")
    setProduct(null)
    setError(null)
    setQuantity("")
    setSaveSuccess(false)
    inputRef.current?.focus()
  }

  const adjustQuantity = (delta: number) => {
    const current = Number.parseInt(quantity, 10) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  return (
    <div className="flex flex-col bg-black px-4 py-4 min-h-screen">
      <div className="mx-auto w-full max-w-lg flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Prehľad inventúry</h2>
          <button onClick={onViewList} className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
            <List className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/20 p-3 text-sm text-red-400 mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/20 p-3 text-sm text-green-400 mb-4">
            <Check className="h-4 w-4 shrink-0" />
            <span>Produkt uložený!</span>
          </div>
        )}

        {!product && !saveSuccess && (
          <>
            {/* Kamera view */}
            <div
              className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#1a1a1a] mb-4 overflow-hidden cursor-pointer"
              onClick={!cameraActive ? startCamera : undefined}
            >
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <Camera className="h-12 w-12" />
                  <span className="text-sm">Kliknite pre spustenie kamery</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-white">Naskenovať EAN</p>
              <p className="text-xs text-white/50">Zadajte EAN kód produktu</p>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="123 456 789 1011"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 w-full rounded-lg bg-[#2e2e38] px-4 text-center text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                {ean && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    onClick={handleClear}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Zadať EAN button */}
              <button
                onClick={handleSearch}
                disabled={!ean.trim() || isLoading}
                className="h-12 w-full rounded-lg bg-[#2e2e38] font-medium text-white transition-colors hover:bg-[#3a3a44] disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Hľadám...
                  </span>
                ) : (
                  "Zadať EAN"
                )}
              </button>
            </div>
          </>
        )}

        {/* Produkt detail - zobrazí sa len keď je produkt nájdený */}
        {product && !saveSuccess && (
          <div className="flex-1 flex flex-col">
            <div className="space-y-4 rounded-lg bg-[#1a1a1a] p-4 flex-1">
              {/* Product info card */}
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#2e2e38]">
                  <span className="text-2xl">🍾</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      {product.alcohol_content && product.alcohol_content !== "0" && (
                        <span className="text-sm text-white/60">{product.alcohol_content}%</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mt-1">{ean}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.volume && <span className="text-sm text-white/60">{product.volume}</span>}
                    <span className="font-semibold text-white">{quantity || "?"} ks</span>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/60">Počet na sklade</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2e2e38] text-white transition-colors hover:bg-[#3a3a44]"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="?"
                      className="h-12 w-full rounded-lg bg-[#2e2e38] px-4 pr-10 text-center text-xl font-semibold text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                      min="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/50">ks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2e2e38] text-white transition-colors hover:bg-[#3a3a44]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!quantity || isSaving}
              className="mt-4 h-12 w-full rounded-lg bg-[#2e2e38] font-medium text-white transition-colors hover:bg-[#3a3a44] disabled:opacity-50 disabled:text-white/40"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ukladám...
                </span>
              ) : (
                "Uložiť"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
