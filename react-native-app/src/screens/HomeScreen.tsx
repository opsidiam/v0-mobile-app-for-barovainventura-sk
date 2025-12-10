"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useAuth } from "../lib/auth-context"
import { api } from "../lib/api"
import { ScannerScreen } from "./ScannerScreen"
import { InventoryListScreen } from "./InventoryListScreen"
import { MissingProductsScreen } from "./MissingProductsScreen"

type ViewType = "start" | "scanner" | "list" | "missing" | "complete"

export function HomeScreen() {
  const { user, logout } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>("start")
  const [inventoryActive, setInventoryActive] = useState(false)
  const [missingCount, setMissingCount] = useState(0)
  const [pendingEan, setPendingEan] = useState<string | undefined>()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkInventoryStatus()
  }, [])

  useEffect(() => {
    if (inventoryActive) {
      loadMissingCount()
      intervalRef.current = setInterval(loadMissingCount, 5000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [inventoryActive])

  async function checkInventoryStatus() {
    const response = await api.getInventoryStatus()
    if (response.success && response.data?.active) {
      setInventoryActive(true)
      setCurrentView("scanner")
    }
  }

  async function loadMissingCount() {
    const response = await api.getMissingProducts()
    if (response.success && response.data) {
      setMissingCount(response.data.total)
    }
  }

  async function handleStartInventory() {
    const response = await api.startInventory()
    if (response.success) {
      setInventoryActive(true)
      setCurrentView("scanner")
    } else {
      Alert.alert("Chyba", response.error || "Nepodarilo sa spustiť inventúru")
    }
  }

  async function handleCompleteInventory() {
    Alert.alert("Ukončiť inventúru", "Naozaj chcete ukončiť inventúru?", [
      { text: "Zrušiť", style: "cancel" },
      {
        text: "Ukončiť",
        style: "destructive",
        onPress: async () => {
          const response = await api.completeInventory()
          if (response.success) {
            setInventoryActive(false)
            setCurrentView("complete")
          }
        },
      },
    ])
  }

  function handleScanProduct(ean: string) {
    setPendingEan(ean)
    setCurrentView("scanner")
  }

  function handlePendingEanProcessed() {
    setPendingEan(undefined)
  }

  if (currentView === "list") {
    return <InventoryListScreen onBack={() => setCurrentView("scanner")} />
  }

  if (currentView === "missing") {
    return <MissingProductsScreen onBack={() => setCurrentView("scanner")} onScanProduct={handleScanProduct} />
  }

  if (currentView === "scanner") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Vitajte, {user?.name}</Text>
            <Text style={styles.statusText}>Inventúra prebieha</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Odhlásiť</Text>
          </TouchableOpacity>
        </View>

        <ScannerScreen
          onNavigate={setCurrentView}
          missingCount={missingCount}
          pendingEan={pendingEan}
          onPendingEanProcessed={handlePendingEanProcessed}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteInventory}>
            <Text style={styles.completeButtonText}>Ukončiť inventúru</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (currentView === "complete") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.completeTitle}>Inventúra ukončená</Text>
          <Text style={styles.completeText}>Inventúra bola úspešne ukončená.</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => setCurrentView("start")}>
            <Text style={styles.startButtonText}>Späť na úvod</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Start view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Vitajte, {user?.name}</Text>
          <Text style={styles.statusText}>Barová Inventúra</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Odhlásiť</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <Text style={styles.title}>Začať inventúru</Text>
        <Text style={styles.description}>Kliknutím na tlačidlo nižšie spustíte novú inventúru.</Text>
        <TouchableOpacity style={styles.startButton} onPress={handleStartInventory}>
          <Text style={styles.startButtonText}>Začať inventúru</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#f87171",
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    color: "#94a3b8",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  completeButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeTitle: {
    color: "#22c55e",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  completeText: {
    color: "#94a3b8",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
})
