"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from "react-native"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { api, type Product, type InventoryItem } from "../lib/api"
import { useInventory } from "../lib/inventory-context"
import { Logo } from "../components/Logo"

interface ScannerScreenProps {
  user?: any
  onNavigate: (screen: "list" | "missing") => void
  onBack: () => void
  missingCount: number
  pendingEan?: string
  onPendingEanProcessed?: () => void
  onCompleteInventory?: () => void
  initialItem?: InventoryItem | null
}

export function ScannerScreen({ user, onNavigate, onBack, missingCount, pendingEan, onPendingEanProcessed, onCompleteInventory, initialItem }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanningActive, setScanningActive] = useState(false)
  const [manualEan, setManualEan] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState("0")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [scanStatus, setScanStatus] = useState("Hľadám čiarový kód...")

  const lastScannedRef = useRef<string | null>(null)
  const scanCountRef = useRef(0)
  const processingRef = useRef(false)

  // Load initial item if provided (edit mode)
  useEffect(() => {
    if (initialItem) {
      setProduct({
        id: initialItem.id,
        name: initialItem.name,
        ean: initialItem.ean,
        quantity_on_stock: 0,
        unit: initialItem.unit
      })
      setQuantity(initialItem.quantity.toString())
      setScanningActive(false)
    }
  }, [initialItem])

  useEffect(() => {
    console.log("ScannerScreen Mounted")
  }, [])

  useEffect(() => {
    if (pendingEan) {
      handleEanSubmit(pendingEan)
      onPendingEanProcessed?.()
    }
  }, [pendingEan])

  async function handleEanSubmit(ean: string) {
    if (!ean || ean.length < 8) {
      setError("EAN kód musí mať aspoň 8 číslic")
      return
    }

    setIsLoading(true)
    setError("")
    setProduct(null)
    setScanningActive(false)

    const response = await api.getProduct(ean)

    if (response.success && response.data) {
      setProduct(response.data)
      setQuantity(response.data.quantity_on_stock?.toString() || "0")
    } else {
      setError(response.error || "Produkt sa nenašiel")
    }

    setIsLoading(false)
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (processingRef.current || product) return

    const scannedData = result.data

    if (!/^\d{8}$|^\d{13}$/.test(scannedData)) {
      return
    }

    if (lastScannedRef.current === scannedData) {
      scanCountRef.current += 1
      setScanStatus(`Overujem: ${scannedData} (${scanCountRef.current}/2)`)

      if (scanCountRef.current >= 2) {
        processingRef.current = true
        setScanStatus(`Načítavam: ${scannedData}`)
        handleEanSubmit(scannedData)

        setTimeout(() => {
          lastScannedRef.current = null
          scanCountRef.current = 0
          processingRef.current = false
        }, 2000)
      }
    } else {
      lastScannedRef.current = scannedData
      scanCountRef.current = 1
      setScanStatus(`Nájdený: ${scannedData} (1/2)`)
    }
  }

  const { addItem, refreshMissingItems } = useInventory()

  async function handleSave() {
    if (!product) return

    setIsSaving(true)

    // Save to local context immediately
    const qty = Number.parseInt(quantity) || 0
    await addItem(product, qty)

    // Attempt to save to API as well (best effort, or maybe we don't block UI on it?)
    // User complaint was about "list missing products", not "save failed". 
    // Usually we want to sync.
    const response = await api.saveProductQuantity(product, qty)

    if (response.success || (response.data && response.data.update_product === "success")) {
      // Success - refresh missing items AFTER successful save
      await refreshMissingItems()
    } else {
      console.warn("API Save failed, but saved locally:", response.error)
    }

    // Reset state regardless of API success (since we saved locally)
    setProduct(null)
    setQuantity("0")
    setManualEan("")
    setScanStatus("Hľadám čiarový kód...")
    setScanningActive(false)

    setIsSaving(false)
  }

  function handleCancel() {
    setProduct(null)
    setQuantity("0")
    setManualEan("")
    setError("")
    setScanStatus("Hľadám čiarový kód...")
  }

  function adjustQuantity(delta: number) {
    const current = Number.parseInt(quantity) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  if (scanningActive) {
    if (!permission || !permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.permissionText}>Vyžaduje sa povolenie kamery</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>Povoliť</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean8", "ean13"] }}
          onBarcodeScanned={product ? undefined : handleBarcodeScanned}
        />
        <View style={[styles.overlay, StyleSheet.absoluteFill]}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanStatusText}>{scanStatus}</Text>
          <TouchableOpacity style={styles.closeCameraButton} onPress={() => setScanningActive(false)}>
            <Text style={styles.closeCameraText}>Zrušiť skenovanie</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.whiteBackButton}>
            <Text style={styles.whiteBackButtonText}>← Nazad</Text>
          </TouchableOpacity>

          <View style={styles.headerInfoRight}>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerLabel}>Meno</Text>
              <Text style={styles.headerValue}>{user?.name || "---"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerLabel}>ID inventúry</Text>
              <Text style={styles.headerValue}>{user?.inv_id || "---"}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Product Detail Modal/View */}
        {product ? (
          <View style={styles.productForm}>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EAN kód produktu</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyInputText}>{product.ean}</Text>
                {/* Placeholder for icon if needed */}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Názov produktu</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyInputText}>{product.name}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Počet na sklade</Text>
              <View style={styles.quantityDisplay}>
                <TouchableOpacity style={styles.quantityControlButton} onPress={() => adjustQuantity(-1)}>
                  <Text style={styles.quantityControlText}>-</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.quantityInputLarge}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={styles.quantityUnit}>ks</Text>

                <TouchableOpacity style={styles.quantityControlButton} onPress={() => adjustQuantity(1)}>
                  <Text style={styles.quantityControlText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Uložiť</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Scan Card */}
            <TouchableOpacity style={styles.scanCard} onPress={() => setScanningActive(true)}>
              {/* Pseudo-icon using text/view shapes if no vector icons available, or just a box */}
              <View style={styles.cameraIcon}>
                <View style={styles.cameraLens} />
              </View>
              <Text style={styles.scanCardText}>Naskenovať EAN</Text>
            </TouchableOpacity>

            {/* Manual Input */}
            <View style={styles.manualInputSection}>
              <Text style={styles.sectionLabel}>Zadať EAN</Text>
              <TextInput
                style={styles.input}
                value={manualEan}
                onChangeText={setManualEan}
                keyboardType="numeric"
                placeholder="Zadajte EAN kód produktu"
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (manualEan.length >= 8 && manualEan.length <= 13) && styles.confirmButtonActive
                ]}
                onPress={() => handleEanSubmit(manualEan)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[
                    styles.confirmButtonText,
                    (manualEan.length >= 8 && manualEan.length <= 13) && styles.confirmButtonTextActive
                  ]}>
                    Potvrdiť
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Navigation */}
            <TouchableOpacity style={styles.overviewButton} onPress={() => onNavigate("list")}>
              <Text style={styles.overviewButtonText}>Prehľad inventúry</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => onNavigate("missing")}>
              <View style={styles.buttonContent}>
                <Text style={styles.secondaryButtonText}>Zoznam chýbajúcich položiek</Text>
                {missingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{missingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.destructiveButton} onPress={onCompleteInventory}>
              <Text style={styles.destructiveButtonText}>Uzavrieť inventúru</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Changed to center for better alignment with back button
  },
  backButton: {
    padding: 8,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  headerInfo: {
    flexDirection: "row",
    gap: 16,
  },
  headerLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  headerValue: {
    color: "#fff",
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  scanCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  cameraIcon: {
    width: 48,
    height: 36,
    backgroundColor: "#000",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cameraLens: {
    width: 16,
    height: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  scanCardText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  manualInputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#14532d",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    opacity: 0.5,
  },
  confirmButtonActive: {
    backgroundColor: "#22c55e", // Light green
  },
  confirmButtonTextActive: {
    opacity: 1,
  },
  overviewButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  overviewButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#334155",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  destructiveButton: {
    backgroundColor: "transparent",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  destructiveButtonText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: "#f87171",
    marginBottom: 16,
    textAlign: "center",
  },

  // Camera Modal Styles
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 40,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 12,
    marginTop: 100,
  },
  scanStatusText: {
    color: "white",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
  },
  closeCameraButton: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    marginBottom: 40,
  },
  closeCameraText: {
    color: "#fff",
    fontWeight: "bold",
  },
  permissionText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40
  },

  // Product Detail Styles (reused mostly)
  productContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
  },
  productName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  productEan: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 20,
  },
  quantityContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 48,
    height: 48,
    backgroundColor: "#334155",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  quantityInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 14,
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  unitText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#334155",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16
  },
  whiteBackButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  whiteBackButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerInfoRight: {
    flexDirection: "row",
    gap: 16,
  },
  headerInfoItem: {
    alignItems: "flex-end", // Align text to right if needed, or just keep left
  },
  productForm: {
    padding: 16,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  readonlyInput: {
    backgroundColor: "#0f172a", // Darker bg
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center', // Centered text as per screenshot (or space-between if icon)
    alignItems: 'center',
  },
  readonlyInputText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  quantityDisplay: {
    backgroundColor: "#1e293b", // Slightly lighter than background
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  quantityInputLarge: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 100,
    textAlign: "right",
  },
  quantityUnit: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#2563eb", // Blue
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  quantityControlButton: {
    backgroundColor: "#334155",
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  quantityControlText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
})
