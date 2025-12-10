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
  Image,
  StatusBar,
  Platform,
} from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import type { RootStackParamList, ScannedProduct } from "../../App"
import { api, type Product } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { Ionicons } from "@expo/vector-icons"

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
      const missing = await api.getMissingProducts()
      setMissingCount(Array.isArray(missing) ? missing.length : 0)
    } catch (error) {
      console.error("Failed to fetch missing count:", error)
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

      setTimeout(() => {
        resetScanner()
        setSaveSuccess(false)
      }, 1000)
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
    setError(null)
    lastScannedRef.current = null
    scanCountRef.current = 0
    setScanStatus("Namierte na EAN kód")
    setCameraActive(true)
    isProcessingRef.current = false
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (isProcessingRef.current || product || !cameraActive || loading) return

    if (!/^(\d{8}|\d{13})$/.test(data)) {
      return
    }

    if (lastScannedRef.current === data) {
      scanCountRef.current += 1
      setScanStatus(`Overujem ${data}...`)

      if (scanCountRef.current >= 2) {
        isProcessingRef.current = true
        setCameraActive(false)
        setScanStatus(`EAN ${data} overený!`)
        Vibration.vibrate(50)
        setTimeout(() => {
          handleEanSubmit(data)
        }, 300)
      }
    } else {
      lastScannedRef.current = data
      scanCountRef.current = 1
      setScanStatus(`Overujem ${data}...`)
    }
  }

  function adjustQuantity(delta: number) {
    const current = Number.parseFloat(quantity) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={styles.permissionText}>Pre skenovanie EAN kódov je potrebný prístup ku kamere</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Povoliť kameru</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <Image source={{ uri: "https://barovainventura.sk/logo.png" }} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>API ID</Text>
              <Text style={styles.userInfoValue}>{user?.userId}</Text>
            </View>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>ID inventúry</Text>
              <Text style={styles.userInfoValue}>{user?.invId}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Navigation buttons - each on separate row */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("InventoryList", { products: scannedProducts })}
        >
          <View style={styles.navButtonLeft}>
            <Ionicons name="list-outline" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.navButtonText}>Prehľad inventúry</Text>
          </View>
          <View style={styles.navButtonRight}>
            <Text style={styles.navButtonCount}>{scannedProducts.length} produktov</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("MissingProducts")}>
          <View style={styles.navButtonLeft}>
            <Ionicons name="alert-circle-outline" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.navButtonText}>Nenaskenované produkty</Text>
            {missingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{missingCount}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Success message */}
        {saveSuccess && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.successText}>Produkt uložený!</Text>
          </View>
        )}

        {/* Camera - full width */}
        {!product && !saveSuccess && (
          <>
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={cameraActive && !loading ? handleBarCodeScanned : undefined}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean8", "ean13"],
                }}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>
              <View style={styles.scanStatusContainer}>
                <View
                  style={[styles.scanStatusBadge, loading && styles.scanStatusLoading, error && styles.scanStatusError]}
                >
                  {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
                  <Text style={styles.scanStatusText}>{loading ? "Hľadám produkt..." : scanStatus}</Text>
                </View>
              </View>
            </View>

            {/* Manual input */}
            <View style={styles.manualInputContainer}>
              <Text style={styles.sectionTitle}>Manuálne zadanie EAN</Text>
              <Text style={styles.sectionSubtitle}>Alebo zadajte EAN kód ručne</Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="123 456 789 1011"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={manualEan}
                  onChangeText={setManualEan}
                  keyboardType="numeric"
                  maxLength={13}
                />
                {manualEan.length > 0 && (
                  <TouchableOpacity style={styles.clearButton} onPress={() => setManualEan("")}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (loading || !manualEan.trim()) && styles.buttonDisabled]}
                onPress={() => handleEanSubmit(manualEan)}
                disabled={loading || !manualEan.trim()}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Hľadám...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Zadať EAN</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Product detail */}
        {product && !saveSuccess && (
          <View style={styles.productContainer}>
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productIcon}>
                  <Text style={styles.productIconText}>🍾</Text>
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.productTitleRow}>
                    <Text style={styles.productName}>{product.name}</Text>
                  </View>
                  {product.alcohol_content && product.alcohol_content !== "0" && (
                    <Text style={styles.productAlcohol}>{product.alcohol_content}%</Text>
                  )}
                  <Text style={styles.productEan}>{currentEan}</Text>
                  <View style={styles.productMeta}>
                    {product.volume && <Text style={styles.productVolume}>{product.volume}</Text>}
                    <Text style={styles.productQuantity}>{quantity || "?"} ks</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={resetScanner} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#f87171" />
                </TouchableOpacity>
              </View>

              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Počet na sklade</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                    <Ionicons name="remove" size={24} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.quantityInputContainer}>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <Text style={styles.quantityUnit}>ks</Text>
                  </View>

                  <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (saving || !quantity) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving || !quantity}
            >
              {saving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveButtonText}>Ukladám...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Uložiť</Text>
              )}
            </TouchableOpacity>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  logo: {
    width: 120,
    height: 32,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userInfo: {
    flexDirection: "row",
    gap: 16,
  },
  userInfoItem: {
    alignItems: "center",
  },
  userInfoLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  userInfoValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  permissionText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#2e2e38",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
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
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  navButtonCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.2)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  successText: {
    color: "#4ade80",
    fontSize: 14,
  },
  cameraContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 16,
    position: "relative",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: "75%",
    height: "33%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderColor: "#fff",
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  scanStatusContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanStatusBadge: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  scanStatusLoading: {
    backgroundColor: "rgba(59,130,246,0.8)",
  },
  scanStatusError: {
    backgroundColor: "rgba(239,68,68,0.8)",
  },
  scanStatusText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  manualInputContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  clearButton: {
    padding: 12,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  productContainer: {
    marginTop: 8,
  },
  productCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 16,
  },
  productHeader: {
    flexDirection: "row",
    gap: 12,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#2e2e38",
    alignItems: "center",
    justifyContent: "center",
  },
  productIconText: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  productName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  productAlcohol: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  productEan: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productVolume: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  productQuantity: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  quantitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2e2e38",
  },
  quantityLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2e2e38",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  quantityInput: {
    flex: 1,
    height: 48,
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  quantityUnit: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginLeft: 4,
  },
  saveButton: {
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
