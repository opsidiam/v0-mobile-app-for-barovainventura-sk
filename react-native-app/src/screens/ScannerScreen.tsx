"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { api, type Product } from "../lib/api"

interface ScannerScreenProps {
  onNavigate: (screen: "list" | "missing") => void
  missingCount: number
  pendingEan?: string
  onPendingEanProcessed?: () => void
}

export function ScannerScreen({ onNavigate, missingCount, pendingEan, onPendingEanProcessed }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions()
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

  async function handleSave() {
    if (!product) return

    setIsSaving(true)

    const response = await api.saveProductQuantity(product.ean, Number.parseInt(quantity) || 0)

    if (response.success) {
      setProduct(null)
      setQuantity("0")
      setManualEan("")
      setScanStatus("Hľadám čiarový kód...")
    } else {
      Alert.alert("Chyba", response.error || "Nepodarilo sa uložiť")
    }

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

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Aplikácia potrebuje prístup ku kamere na skenovanie čiarových kódov.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Povoliť kameru</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["ean8", "ean13"],
          }}
          onBarcodeScanned={product ? undefined : handleBarcodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          </View>
        </CameraView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Manual Input */}
        {!product && (
          <View style={styles.manualInputContainer}>
            <Text style={styles.label}>Alebo zadajte EAN manuálne:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={manualEan}
                onChangeText={setManualEan}
                keyboardType="numeric"
                placeholder="EAN kód"
                placeholderTextColor="#64748b"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => handleEanSubmit(manualEan)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Hľadať</Text>
                )}
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}

        {/* Product Detail */}
        {product && (
          <View style={styles.productContainer}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productEan}>EAN: {product.ean}</Text>

            <View style={styles.quantityContainer}>
              <Text style={styles.label}>Počet kusov:</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />

                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.unitText}>{product.unit}</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Zrušiť</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Uložiť</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        {!product && (
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navButton} onPress={() => onNavigate("list")}>
              <Text style={styles.navButtonText}>Prehľad inventúry</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navButton} onPress={() => onNavigate("missing")}>
              <View style={styles.navButtonContent}>
                <Text style={styles.navButtonText}>Nenaskenované produkty</Text>
                {missingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{missingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  cameraContainer: {
    height: 300,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 12,
  },
  scanStatusText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 24,
    fontSize: 16,
  },
  manualInputContainer: {
    marginBottom: 24,
  },
  label: {
    color: "#e2e8f0",
    fontSize: 14,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#f87171",
    marginTop: 8,
    fontSize: 14,
  },
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
  navButtons: {
    gap: 12,
  },
  navButton: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  navButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
})
