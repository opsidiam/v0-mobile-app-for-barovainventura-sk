"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Vibration,
} from "react-native"
import { Camera, CameraType, type BarCodeScanningResult } from "expo-camera"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import type { RootStackParamList } from "../../App"
import { api, type Product } from "../lib/api"
import { Ionicons } from "@expo/vector-icons"

type ScannerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Scanner">
  route: RouteProp<RootStackParamList, "Scanner">
}

export function ScannerScreen({ navigation, route }: ScannerScreenProps) {
  const [permission, requestPermission] = Camera.useCameraPermissions()
  const [manualEan, setManualEan] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState("0")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanStatus, setScanStatus] = useState<"scanning" | "verifying" | "found">("scanning")
  const [scanned, setScanned] = useState(false)

  const lastScannedRef = useRef<string | null>(null)
  const scanCountRef = useRef(0)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (route.params?.pendingEan) {
      handleEanSubmit(route.params.pendingEan)
    }
  }, [route.params?.pendingEan])

  async function handleEanSubmit(ean: string) {
    if (!ean || ean.length < 8) {
      Alert.alert("Chyba", "Zadajte platný EAN kód (8 alebo 13 číslic)")
      return
    }

    setLoading(true)
    setProduct(null)

    try {
      const data = await api.getProduct(ean)
      setProduct(data)
      setQuantity(data.quantity_on_stock?.toString() || "0")
      Vibration.vibrate(100)
    } catch (error) {
      Alert.alert("Chyba", "Produkt nebol nájdený")
      setScanned(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!product) return

    setSaving(true)
    try {
      await api.saveInventoryItem(product.ean, Number.parseFloat(quantity) || 0)
      Alert.alert("Úspech", "Produkt bol uložený")
      setProduct(null)
      setQuantity("0")
      setManualEan("")
      lastScannedRef.current = null
      scanCountRef.current = 0
      setScanStatus("scanning")
      setScanned(false)
    } catch (error) {
      Alert.alert("Chyba", "Nepodarilo sa uložiť produkt")
    } finally {
      setSaving(false)
    }
  }

  function handleBarCodeScanned({ type, data }: BarCodeScanningResult) {
    if (isProcessingRef.current || product || scanned) return

    const scannedData = data

    if (!/^(\d{8}|\d{13})$/.test(scannedData)) {
      return
    }

    if (lastScannedRef.current === scannedData) {
      scanCountRef.current += 1
      setScanStatus("verifying")

      if (scanCountRef.current >= 2) {
        isProcessingRef.current = true
        setScanned(true)
        setScanStatus("found")
        handleEanSubmit(scannedData).finally(() => {
          isProcessingRef.current = false
        })
      }
    } else {
      lastScannedRef.current = scannedData
      scanCountRef.current = 1
      setScanStatus("verifying")
    }
  }

  function adjustQuantity(delta: number) {
    const current = Number.parseFloat(quantity) || 0
    const newValue = Math.max(0, current + delta)
    setQuantity(newValue.toString())
  }

  function handleCancelProduct() {
    setProduct(null)
    setQuantity("0")
    setManualEan("")
    lastScannedRef.current = null
    scanCountRef.current = 0
    setScanStatus("scanning")
    setScanned(false)
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4f9cff" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#666" />
        <Text style={styles.permissionText}>Pre skenovanie EAN kódov je potrebný prístup ku kamere</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Povoliť kameru</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {!product && (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={CameraType.back}
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            barCodeScannerSettings={{
              barCodeTypes: ["ean8", "ean13"],
            }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
          </View>
          <View style={styles.scanStatusContainer}>
            <Text style={styles.scanStatusText}>
              {scanStatus === "scanning" && "Nasmerujte kameru na EAN kód"}
              {scanStatus === "verifying" && "Overujem kód..."}
              {scanStatus === "found" && "Kód nájdený!"}
            </Text>
          </View>
        </View>
      )}

      {!product && (
        <View style={styles.manualInputContainer}>
          <Text style={styles.sectionTitle}>Alebo zadajte EAN manuálne</Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="EAN kód"
              placeholderTextColor="#666"
              value={manualEan}
              onChangeText={setManualEan}
              keyboardType="numeric"
              maxLength={13}
            />
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.buttonDisabled]}
              onPress={() => handleEanSubmit(manualEan)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="search" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {product && (
        <View style={styles.productContainer}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <TouchableOpacity onPress={handleCancelProduct}>
              <Ionicons name="close-circle" size={28} color="#ff6b6b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.productEan}>EAN: {product.ean}</Text>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Počet ({product.unit})</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                <Ionicons name="remove" size={24} color="#fff" />
              </TouchableOpacity>

              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                textAlign="center"
              />

              <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Uložiť</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  contentContainer: {
    paddingBottom: 24,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#1a1a2e",
  },
  permissionText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#4f9cff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    height: 300,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#4f9cff",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  scanStatusContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanStatusText: {
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  manualInputContainer: {
    padding: 16,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 14,
    marginBottom: 12,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  manualInput: {
    flex: 1,
    backgroundColor: "#2a2a4e",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#3a3a5e",
  },
  searchButton: {
    backgroundColor: "#4f9cff",
    borderRadius: 12,
    width: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  productContainer: {
    margin: 16,
    backgroundColor: "#2a2a4e",
    borderRadius: 16,
    padding: 20,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 12,
  },
  productEan: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },
  quantityContainer: {
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#4f9cff",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityInput: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
})
