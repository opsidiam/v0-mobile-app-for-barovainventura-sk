"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Vibration,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import type { RootStackParamList, ScannedProduct } from "../../App"
import { api, type Product } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { Ionicons } from "@expo/vector-icons"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

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
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([])

  const lastScannedRef = useRef<string | null>(null)
  const scanCountRef = useRef(0)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    fetchMissingCount()
    const interval = setInterval(fetchMissingCount, 5000)
    return () => clearInterval(interval)
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
      const result = await api.getProductByEan(ean)

      if (result.product_found) {
        const foundProduct = Array.isArray(result.product_found) ? result.product_found[0] : result.product_found
        setProduct(foundProduct)
        const serverQuantity = foundProduct.quantity_on_stock
        setQuantity(serverQuantity && serverQuantity !== "0" ? serverQuantity : "0")
        Vibration.vibrate(100)
        setScanStatus("Produkt nájdený!")
      } else if (result.product_not_found) {
        setError(`Produkt s EAN ${ean} nebol nájdený v databáze.`)
        setScanStatus("Produkt neexistuje")
        Vibration.vibrate([0, 200, 100, 200])
        setTimeout(() => {
          resetScanner()
        }, 3000)
      }
    } catch (err) {
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

      const newScannedProduct: ScannedProduct = {
        ean: currentEan,
        name: product.name,
        quantity: quantity,
        volume: product.volume,
        alcoholContent: product.alcohol_content,
        scannedAt: new Date(),
      }
      setScannedProducts((prev) => [...prev, newScannedProduct])

      setSaveSuccess(true)
      Vibration.vibrate(100)

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

      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoBarova}>BAROVÁ</Text>
          <Text style={styles.logoInventura}>inventúra</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>API ID</Text>
              <Text style={styles.infoValue}>{user?.userId || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ID inventúry</Text>
              <Text style={styles.infoValue}>{user?.invId || "-"}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Navigation buttons */}
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate("InventoryList", { products: scannedProducts })}
          >
            <View style={styles.navButtonContent}>
              <Ionicons name="list-outline" size={20} color="#fff" />
              <Text style={styles.navButtonText}>Prehľad inventúry</Text>
            </View>
            <View style={styles.navBadgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{scannedProducts.length}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("MissingProducts")}>
            <View style={styles.navButtonContent}>
              <Ionicons name="warning-outline" size={20} color="#fff" />
              <Text style={styles.navButtonText}>Nenaskenované produkty</Text>
            </View>
            <View style={styles.navBadgeContainer}>
              {missingCount > 0 && (
                <View style={[styles.badge, styles.badgeRed]}>
                  <Text style={styles.badgeText}>{missingCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          {cameraActive ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean8", "ean13"],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
              </View>
            </CameraView>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Ionicons name="camera" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.cameraPlaceholderText}>Kamera pozastavená</Text>
            </View>
          )}

          <View
            style={[
              styles.statusBadge,
              error ? styles.statusError : loading ? styles.statusLoading : styles.statusNormal,
            ]}
          >
            <Text style={styles.statusText}>{error ? "Chyba" : scanStatus}</Text>
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Manual EAN input */}
        {!product && (
          <View style={styles.manualInputContainer}>
            <Text style={styles.manualInputLabel}>Alebo zadajte EAN manuálne:</Text>
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="EAN kód"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={manualEan}
                onChangeText={setManualEan}
                keyboardType="numeric"
                maxLength={13}
              />
              <TouchableOpacity
                style={[styles.manualButton, loading && styles.buttonDisabled]}
                onPress={() => handleEanSubmit(manualEan)}
                disabled={loading || !manualEan}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Product detail */}
        {product && (
          <View style={styles.productCard}>
            {saveSuccess && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.successText}>Úspešne uložené!</Text>
              </View>
            )}

            <View style={styles.productHeader}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
            </View>

            <View style={styles.productDetails}>
              <View style={styles.productDetailRow}>
                <Text style={styles.productDetailLabel}>EAN:</Text>
                <Text style={styles.productDetailValue}>{currentEan}</Text>
              </View>
              {product.volume && (
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Objem:</Text>
                  <Text style={styles.productDetailValue}>{product.volume}</Text>
                </View>
              )}
              {product.alcohol_content && (
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Alkohol:</Text>
                  <Text style={styles.productDetailValue}>{product.alcohol_content}%</Text>
                </View>
              )}
              <View style={styles.productDetailRow}>
                <Text style={styles.productDetailLabel}>Typ:</Text>
                <Text style={styles.productDetailValue}>
                  {product.selling_method === "rozlievane" ? "Rozlievané" : "Kusový predaj"}
                </Text>
              </View>
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Výsledná hodnota:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                  <Ionicons name="remove" size={24} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={styles.quantityUnit}>ks</Text>
                <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.productActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
                <Text style={styles.cancelButtonText}>Zrušiť</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Uložiť</Text>
                )}
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 + 15 : 15,
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  logoBox: {
    alignItems: "flex-start",
  },
  logoBarova: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
  },
  logoInventura: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userInfo: {
    flexDirection: "row",
    gap: 16,
  },
  infoItem: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#2e2e38",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  navButtons: {
    gap: 8,
    marginBottom: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
  },
  navButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonText: {
    fontSize: 16,
    color: "#fff",
  },
  navBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#3a3a44",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  badgeRed: {
    backgroundColor: "#ef4444",
  },
  badgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  cameraContainer: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    marginBottom: 16,
    alignSelf: "center",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 12,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cameraPlaceholderText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  statusBadge: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusNormal: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  statusLoading: {
    backgroundColor: "rgba(59,130,246,0.8)",
  },
  statusError: {
    backgroundColor: "rgba(239,68,68,0.8)",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    flex: 1,
  },
  manualInputContainer: {
    marginBottom: 16,
  },
  manualInputLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
  },
  manualButton: {
    width: 48,
    height: 48,
    backgroundColor: "#3a3a44",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
  },
  productHeader: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  productBrand: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  productDetails: {
    gap: 8,
    marginBottom: 16,
  },
  productDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productDetailLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  productDetailValue: {
    fontSize: 14,
    color: "#fff",
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  quantityButton: {
    width: 48,
    height: 48,
    backgroundColor: "#3a3a44",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInput: {
    width: 80,
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  quantityUnit: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  productActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    height: 48,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#3a3a44",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
