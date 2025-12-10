"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getProductByEan, updateProduct, getMissingProducts, type Product } from "@/lib/api"
import { AlertCircle, Camera, Check, Loader2, X, Plus, Minus, List, ChevronRight, CameraOff } from "lucide-react"
import type { ScannedProduct } from "./app-shell"
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library"

interface ScannerViewProps {
  onProductScanned: (product: ScannedProduct) => void
  onViewList: () => void
  onViewMissingProducts: () => void
  scannedCount: number
  pendingEan?: string
  onPendingEanProcessed?: () => void
}

export function ScannerView({
  onProductScanned,
  onViewList,
  onViewMissingProducts,
  scannedCount,
  pendingEan,
  onPendingEanProcessed,
}: ScannerViewProps) {
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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [missingCount, setMissingCount] = useState(0)

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const scanCountRef = useRef<number>(0)
  const [scanningStatus, setScanningStatus] = useState<string>("")

  const isValidEan = (code: string): boolean => {
    const cleaned = code.replace(/\s/g, "")
    return /^\d{8}$/.test(cleaned) || /^\d{13}$/.test(cleaned)
  }

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ])

      const codeReader = new BrowserMultiFormatReader(hints)
      codeReaderRef.current = codeReader

      const videoInputDevices = await codeReader.listVideoInputDevices()

      if (videoInputDevices.length === 0) {
        setCameraError("Nebola nájdená žiadna kamera")
        return
      }

      // Prefer back camera
      const backCamera = videoInputDevices.find(
        (device) => device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("rear"),
      )
      const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId

      setCameraActive(true)
      setScanningStatus("Hľadám EAN kód...")

      await codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current!, (result, err) => {
        if (result) {
          const scannedCode = result.getText()

          if (isValidEan(scannedCode)) {
            if (lastScannedRef.current === scannedCode) {
              scanCountRef.current += 1

              if (scanCountRef.current >= 2) {
                // Verified - same code scanned twice
                setScanningStatus(`EAN ${scannedCode} overený!`)

                // Reset for next scan
                lastScannedRef.current = null
                scanCountRef.current = 0

                // Auto-submit
                setEan(scannedCode)
                handleSearchWithEan(scannedCode)
              }
            } else {
              // First scan of this code
              lastScannedRef.current = scannedCode
              scanCountRef.current = 1
              setScanningStatus(`Overujem ${scannedCode}...`)
            }
          }
        }
      })
    } catch (err) {
      console.error("Camera error:", err)
      setCameraError("Nepodarilo sa spustiť kameru. Skontrolujte povolenia.")
      setCameraActive(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
      codeReaderRef.current = null
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setScanningStatus("")
    lastScannedRef.current = null
    scanCountRef.current = 0
  }, [])

  useEffect(() => {
    if (!product && !saveSuccess) {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (!product && !saveSuccess && !cameraActive) {
      startCamera()
    }
  }, [product, saveSuccess])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (pendingEan && token) {
      setEan(pendingEan)
      handleSearchWithEan(pendingEan)
      onPendingEanProcessed?.()
    }
  }, [pendingEan, token])

  useEffect(() => {
    const fetchMissingCount = async () => {
      if (!token) return
      try {
        const missing = await getMissingProducts(token)
        setMissingCount(Array.isArray(missing) ? missing.length : 0)
      } catch (error) {
        console.error("Failed to fetch missing products count:", error)
      }
    }

    fetchMissingCount()
    const interval = setInterval(fetchMissingCount, 5000)
    return () => clearInterval(interval)
  }, [token])

  const handleSearchWithEan = async (searchEan: string) => {
    if (!searchEan.trim() || !token) return

    setIsLoading(true)
    setError(null)
    setProduct(null)
    setSaveSuccess(false)

    stopCamera()

    try {
      const result = await getProductByEan(token, searchEan.trim())

      if (result.product_found) {
        const foundProduct = Array.isArray(result.product_found) ? result.product_found[0] : result.product_found
        setProduct(foundProduct)
        const serverQuantity = foundProduct.quantity_on_stock
        setQuantity(serverQuantity && serverQuantity !== "0" ? serverQuantity : "0")
      } else if (result.product_not_found) {
        setError(`Produkt s EAN ${searchEan} nebol nájdený v databáze.`)
        startCamera()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vyhľadávanie zlyhalo")
      startCamera()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    await handleSearchWithEan(ean)
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
        startCamera()
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
    startCamera()
  }

  const adjustQuantity = (delta: number) => {
    const current = Number.parseInt(quantity, 10) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  return (
    <div className="flex flex-col bg-black px-4 py-4 min-h-screen">
      <div className="mx-auto w-full max-w-lg flex flex-col flex-1">
        <button
          onClick={onViewList}
          className="flex items-center justify-between w-full rounded-lg bg-[#1a1a1a] px-4 py-3 mb-2 hover:bg-[#2e2e38] transition-colors"
        >
          <div className="flex items-center gap-3">
            <List className="h-5 w-5 text-white/60" />
            <span className="text-sm font-medium text-white">Prehľad inventúry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">{scannedCount} produktov</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </div>
        </button>

        <button
          onClick={onViewMissingProducts}
          className="flex items-center justify-between w-full rounded-lg bg-[#1a1a1a] px-4 py-3 mb-4 hover:bg-[#2e2e38] transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-white/60" />
            <span className="text-sm font-medium text-white">Nenaskenované produkty</span>
            {missingCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {missingCount}
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-white/40" />
        </button>

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
            <div className="relative aspect-[4/3] rounded-lg bg-[#1a1a1a] mb-4 overflow-hidden">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-white/40 p-4">
                  <CameraOff className="h-12 w-12" />
                  <span className="text-sm text-center">{cameraError}</span>
                  <button
                    onClick={startCamera}
                    className="mt-2 px-4 py-2 rounded-lg bg-[#2e2e38] text-white text-sm hover:bg-[#3a3a44]"
                  >
                    Skúsiť znova
                  </button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {/* Scanning frame */}
                    <div className="w-3/4 h-1/3 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg" />
                    </div>
                  </div>
                  {/* Status indicator */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <div className="bg-black/70 px-3 py-1.5 rounded-full">
                      <span className="text-xs text-white/80">
                        {isLoading ? "Hľadám produkt..." : scanningStatus || "Namierte na EAN kód"}
                      </span>
                    </div>
                  </div>
                  {/* Camera toggle button */}
                  <button
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white/80 hover:bg-black/70"
                  >
                    {cameraActive ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                  </button>
                </>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-white">Manuálne zadanie EAN</p>
              <p className="text-xs text-white/50">Alebo zadajte EAN kód ručne</p>

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
          <div className="flex flex-col">
            <div className="space-y-4 rounded-lg bg-[#1a1a1a] p-4">
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
