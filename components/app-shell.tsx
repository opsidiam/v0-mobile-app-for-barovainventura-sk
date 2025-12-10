"use client"

import { useState } from "react"
import { AppHeader } from "./app-header"
import { InventoryStartView } from "./inventory-start-view"
import { ScannerView } from "./scanner-view"
import { InventoryListView } from "./inventory-list-view"
import { InventoryCompleteView } from "./inventory-complete-view"

export type AppView = "start" | "scanner" | "list" | "complete"

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

export function AppShell() {
  const [activeView, setActiveView] = useState<AppView>("start")
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([])

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

  const renderView = () => {
    switch (activeView) {
      case "start":
        return <InventoryStartView onStartScanning={() => setActiveView("scanner")} />
      case "scanner":
        return (
          <ScannerView
            onProductScanned={handleAddProduct}
            onViewList={() => setActiveView("list")}
            scannedCount={scannedProducts.length}
          />
        )
      case "list":
        return (
          <InventoryListView
            products={scannedProducts}
            onBack={() => setActiveView("scanner")}
            onRemoveProduct={handleRemoveProduct}
            onComplete={handleCompleteInventory}
          />
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
