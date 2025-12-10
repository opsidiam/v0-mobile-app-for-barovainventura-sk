"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import type { RootStackParamList } from "../../App"
import { api, type Product } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { Ionicons } from "@expo/vector-icons"
import { Logo } from "../components/Logo"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const LOGO_URL = "/images/v2-20alt-20-20w.png"

type ScannerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Scanner">
  route: RouteProp<RootStackParamList, "Scanner">
}

export function ScannerScreen({ navigation, route }: ScannerScreenProps) {
  const { user, logout } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [manualEan, setManualEan] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [currentEan, setCurrentEan] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>("Namierte na EAN kód")
  const [cameraActive, setCameraActive] = useState(true)
  const [missingCount, setMissingCount] = useState(0)
  const [scannedProducts, setScannedProducts] = useState<Product[]>([])

  const lastScannedRef = useRef<string | null>(null)
  const scanCountRef = useRef(0)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    fetchMissingCount()
  }, [])

  async function fetchMissingCount() {
    try {
      console.log("[v0] Fetching missing products count...")
      const missing = await api.getMissingProducts()
      console.log("[v0] Missing products response:", JSON.stringify(missing))
      const count = Array.isArray(missing) ? missing.length : 0
      console.log("[v0] Missing count:", count)
      setMissingCount(count)
    } catch (error) {
      console.error("[v0] Failed to fetch missing count:", error)
    }
  }

  useEffect(() => {
    if (route.params?.pendingEan) {
      handleEanSubmit(route.params.pendingEan)
    }
  }, [route.params?.pendingEan])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  async function handleEanSubmit(ean: string) {
    if (!ean || ean.length < 8) {
      setError("Zadajte platný EAN kód (8 alebo 13 číslic)")
      setTimeout(() => {
        setCameraActive(true)
        isProcessingRef.current = false
      }, 1500)
      return
    }

    setLoading(true)
    setProduct(null)
    setError(null)
    setSaveSuccess(false)
    setCurrentEan(ean)
    setCameraActive(false)

    try {
      console.log("[v0] Calling API getProductByEan for:", ean)
      const result = await api.getProductByEan(ean)
      console.log("[v0] API response:", result)

      if (result.product_found && result.product_found !== null) {
        const foundProduct = Array.isArray(result.product_found) ? result.product_found[0] : result.product_found
        setProduct(foundProduct)
        const serverQuantity = foundProduct.quantity_on_stock
        setQuantity(serverQuantity && serverQuantity !== "0" ? serverQuantity : "0")
        Vibration.vibrate(100)
        setScanStatus("Produkt nájdený!")
      } else {
        // Product not found - either product_not_found is present or product_found is null/missing
        setError("Produkt neexistuje. Pre vytvorenie produktu použite PC aplikáciu.")
        setScanStatus("Produkt neexistuje")
        Vibration.vibrate([0, 200, 100, 200])
        setTimeout(() => {
          resetScanner()
        }, 3000)
      }
    } catch (err) {
      console.log("[v0] API error:", err)
      setError(err instanceof Error ? err.message : "Vyhľadávanie zlyhalo")
      setScanStatus("Chyba vyhľadávania")
      setTimeout(() => {
        resetScanner()
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!product || !currentEan) return

    setSaving(true)
    setError(null)

    try {
      await api.updateProduct({
        scan_id: product.scan_id,
        ean: currentEan,
        full_pack: quantity,
        type: product.selling_method === "rozlievane" ? 0 : 1,
      })

      const newScannedProduct: Product = {
        scan_id: product.scan_id,
        ean: currentEan,
        name: product.name,
        quantity_on_stock: quantity,
        volume: product.volume,
        alcohol_content: product.alcohol_content,
        selling_method: product.selling_method,
      }
      setScannedProducts((prev) => [...prev, newScannedProduct])

      setSaveSuccess(true)
      Vibration.vibrate(100)

      fetchMissingCount()

      setTimeout(() => {
        resetScanner()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uloženie zlyhalo")
    } finally {
      setSaving(false)
    }
  }

  function resetScanner() {
    setProduct(null)
    setCurrentEan("")
    setQuantity("0")
    setManualEan("")
    setSaveSuccess(false)
    setError(null)
    setScanStatus("Namierte na EAN kód")
    setCameraActive(true)
    lastScannedRef.current = null
    scanCountRef.current = 0
    isProcessingRef.current = false
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (isProcessingRef.current || !cameraActive) return
    if (!/^\d{8}$|^\d{13}$/.test(data)) return

    if (data === lastScannedRef.current) {
      scanCountRef.current += 1
      if (scanCountRef.current >= 2) {
        isProcessingRef.current = true
        setCameraActive(false)
        setScanStatus("EAN overený, vyhľadávam...")
        Vibration.vibrate(50)
        handleEanSubmit(data)
      }
    } else {
      lastScannedRef.current = data
      scanCountRef.current = 1
      setScanStatus(`Overujem: ${data}`)
    }
  }

  function adjustQuantity(delta: number) {
    const current = Number.parseInt(quantity, 10) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={styles.permissionText}>Pre skenovanie potrebujeme prístup ku kamere</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Povoliť kameru</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Logo width={120} height={35} />

        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>
              Meno: <Text style={styles.userInfoValue}>{user?.userName || "-"}</Text>
            </Text>
            <Text style={styles.userInfoLabel}>
              ID inventúry: <Text style={styles.userInfoValue}>{user?.invId || "-"}</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Popup */}
      {saveSuccess && (
        <View style={styles.successPopup}>
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.successText}>Produkt bol úspešne uložený!</Text>
          </View>
        </View>
      )}

      {/* Error Popup */}
      {error && (
        <View style={styles.errorPopup}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {!product && (
          <>
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate("InventoryList", { products: scannedProducts })}
              >
                <View style={styles.navButtonLeft}>
                  <Ionicons name="list-outline" size={20} color="#fff" />
                  <Text style={styles.navButtonTitle}>Prehľad inventúry</Text>
                </View>
                <View style={styles.navButtonRight}>
                  {scannedProducts.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{scannedProducts.length}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("MissingProducts")}>
                <View style={styles.navButtonLeft}>
                  <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                  <Text style={styles.navButtonTitle}>Nenaskenované produkty</Text>
                </View>
                <View style={styles.navButtonRight}>
                  {missingCount > 0 && (
                    <View style={[styles.badge, styles.badgeRed]}>
                      <Text style={styles.badgeText}>{missingCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Camera */}
            {cameraActive ? (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["ean8", "ean13"],
                  }}
                />
                <View style={styles.scanFrame} />
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                <View style={styles.cameraPlaceholder}>
                  <ActivityIndicator color="#fff" size="large" />
                  <Text style={styles.cameraPlaceholderText}>Spracovávam...</Text>
                </View>
              </View>
            )}

            {!product && scanStatus && (
              <View
                style={[
                  styles.statusBadge,
                  loading ? styles.statusBadgeScanning : error ? styles.statusBadgeError : styles.statusBadgeVerifying,
                ]}
              >
                <Text style={styles.statusText}>{scanStatus}</Text>
              </View>
            )}

            {/* Manual EAN Input */}
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Zadajte EAN manuálne</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualEan}
                  onChangeText={setManualEan}
                  placeholder="EAN kód"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.manualInputButton} onPress={() => handleEanSubmit(manualEan)}>
                  <Ionicons name="search-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Product Detail Card */}
        {product && (
          <View style={styles.productCard}>
            <View style={styles.productCardHeader}>
              <View style={styles.productCardInfo}>
                <Text style={styles.productCardTitle}>{product.name}</Text>
                {product.brand && <Text style={styles.productCardBrand}>{product.brand}</Text>}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={resetScanner}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.productCardBody}>
              {product.volume && (
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Objem</Text>
                  <Text style={styles.productDetailValue}>{product.volume} l</Text>
                </View>
              )}
              {product.alcohol_content && (
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Alkoholový obsah</Text>
                  <Text style={styles.productDetailValue}>{product.alcohol_content}%</Text>
                </View>
              )}
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Počet na sklade</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.productCardActions}>
              <TouchableOpacity
                style={[styles.productCardButton, styles.cancelButton]}
                onPress={resetScanner}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Zrušiť</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.productCardButton, styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Uložiť</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 15 : 15,
    paddingBottom: 12,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#2e2e38",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  userInfoLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  userInfoValue: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  navButtons: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2e2e38",
  },
  navButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButtonTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  navButtonCount: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  badge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  badgeRed: {
    backgroundColor: "#ef4444",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 250,
    height: 150,
    marginLeft: -125,
    marginTop: -75,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
  },
  statusBadge: {
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusBadgeScanning: {
    backgroundColor: "rgba(34,197,94,0.9)",
  },
  statusBadgeVerifying: {
    backgroundColor: "rgba(59,130,246,0.9)",
  },
  statusBadgeError: {
    backgroundColor: "rgba(239,68,68,0.9)",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  permissionContainer: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    marginBottom: 16,
  },
  permissionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: "#3a3a44",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  manualInputContainer: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  manualInputLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 14,
  },
  manualInputButton: {
    width: 44,
    height: 44,
    backgroundColor: "#3a3a44",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  productCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  productCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  productCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  productCardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  productCardBrand: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  productCardBody: {
    gap: 12,
    marginBottom: 16,
  },
  productDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productDetailLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  productDetailValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  quantityInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  productCardActions: {
    flexDirection: "row",
    gap: 12,
  },
  productCardButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#2e2e38",
  },
  saveButton: {
    backgroundColor: "#3a3a44",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.9)",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  successPopup: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  errorPopup: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
})
