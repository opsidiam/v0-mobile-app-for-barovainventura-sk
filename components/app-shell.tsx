"use client"

import { useState } from "react"
import { AppHeader } from "./app-header"
import { InventoryStartView } from "./inventory-start-view"
import { ScannerView } from "./scanner-view"
import { InventoryListView } from "./inventory-list-view"
import { InventoryCompleteView } from "./inventory-complete-view"
import { MissingProductsView } from "./missing-products-view"

export type AppView = "start" | "scanner" | "list" | "missing" | "complete"

export interface ScannedProduct {
  ean: string
  name: string
  brand: string
  quantity: number
  volume?: string
  alcoholContent?: string
  scanId?: string
  scannedAt: Date
}

interface AppShellState {
  pendingEan?: string
}

export function AppShell() {
  const [activeView, setActiveView] = useState<AppView>("start")
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([])
  const [pendingEan, setPendingEan] = useState<string | undefined>()

  const handleAddProduct = (product: ScannedProduct) => {
    setScannedProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.ean === product.ean)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = product
        return updated
      }
      return [product, ...prev]
    })
  }

  const handleRemoveProduct = (ean: string) => {
    setScannedProducts((prev) => prev.filter((p) => p.ean !== ean))
  }

  const handleCompleteInventory = () => {
    setActiveView("complete")
  }

  const handleNewInventory = () => {
    setScannedProducts([])
    setActiveView("start")
  }

  const handleManualAddProduct = (ean: string) => {
    setPendingEan(ean)
    setActiveView("scanner")
  }

  const handlePendingEanProcessed = () => {
    setPendingEan(undefined)
  }

  const renderView = () => {
    switch (activeView) {
      case "start":
        return <InventoryStartView onStartScanning={() => setActiveView("scanner")} />
      case "scanner":
        return (
          <ScannerView
            onProductScanned={handleAddProduct}
            onViewList={() => setActiveView("list")}
            onViewMissingProducts={() => setActiveView("missing")}
            scannedCount={scannedProducts.length}
            pendingEan={pendingEan}
            onPendingEanProcessed={handlePendingEanProcessed}
          />
        )
      case "list":
        return (
          <InventoryListView
            products={scannedProducts}
            onBack={() => setActiveView("scanner")}
            onRemoveProduct={handleRemoveProduct}
            onComplete={handleCompleteInventory}
            onManualAddProduct={handleManualAddProduct}
          />
        )
      case "missing":
        return (
          <MissingProductsView onBack={() => setActiveView("scanner")} onManualAddProduct={handleManualAddProduct} />
        )
      case "complete":
        return <InventoryCompleteView onNewInventory={handleNewInventory} />
      default:
        return <InventoryStartView onStartScanning={() => setActiveView("scanner")} />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <AppHeader />
      <main className="flex-1">{renderView()}</main>
    </div>
  )
}
