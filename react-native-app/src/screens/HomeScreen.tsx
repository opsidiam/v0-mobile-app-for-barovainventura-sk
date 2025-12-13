"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native"
import { useAuth } from "../lib/auth-context"
import { useInventory } from "../lib/inventory-context"
import { api, type InventoryItem } from "../lib/api"
import { Logo } from "../components/Logo"
import Svg, { Path, Rect } from "react-native-svg"
import { ScannerScreen } from "./ScannerScreen"
import { InventoryListScreen } from "./InventoryListScreen"
import { MissingProductsScreen } from "./MissingProductsScreen"

type ViewType = "start" | "scanner" | "list" | "missing" | "complete"

export function HomeScreen() {
  const { user, logout } = useAuth()
  const { clearItems, missingCount } = useInventory()
  const [currentView, setCurrentView] = useState<ViewType>("start")
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isStartingInventory, setIsStartingInventory] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [inventoryActive, setInventoryActive] = useState(false)
  // Removed local missingCount state
  const [pendingEan, setPendingEan] = useState<string | undefined>()

  async function handleLogout() {
    // Clear local inventory items on logout as requested
    await clearItems()
    await logout()
  }

  useEffect(() => {
    // If we have a user and they are logged in, we assume they are ready to scan.
    // However, the design has a "Start Inventory" button.
    // We can check if "inventoryActive" was persisted or just default to false until they click start.
    // user.inv_id exists, so inventory is technically "open" on the backend context?
    // Let's just default to showing the dashboard until they click Start.
  }, [])

  // Removed loadMissingCount and its useEffect as we use context now

  function handleEditItem(item: InventoryItem) {
    setEditingItem(item)
    setCurrentView("scanner")
  }

  async function handleStartInventory() {
    if (isStartingInventory) return
    setIsStartingInventory(true)

    // Just local state transition
    setTimeout(() => {
      setInventoryActive(true)
      setCurrentView("scanner")
      setIsStartingInventory(false)
    }, 500)
  }

  async function handleCompleteInventory() {
    // Just local state transition
    console.log("Completing Inventory - Local Action")
    setInventoryActive(false)
    setCurrentView("complete")
  }

  function handleScanProduct(ean: string) {
    setPendingEan(ean)
    setCurrentView("scanner")
  }

  function handlePendingEanProcessed() {
    setPendingEan(undefined)
  }

  if (currentView === "list") {
    return (
      <InventoryListScreen
        user={user}
        onBack={() => setCurrentView("scanner")}
        onCompleteInventory={handleCompleteInventory}
        onEdit={handleEditItem}
      />
    )
  }

  if (currentView === "missing") {
    return (
      <MissingProductsScreen
        user={user}
        onBack={() => setCurrentView("scanner")}
        onScanProduct={handleScanProduct}
      />
    )
  }

  if (currentView === "scanner") {
    return (
      <View style={styles.container}>
        <ScannerScreen
          user={user}
          onNavigate={(view) => {
            setEditingItem(null)
            setCurrentView(view)
          }}
          onBack={() => {
            setEditingItem(null)
            setCurrentView("start")
          }}
          missingCount={missingCount}
          pendingEan={pendingEan}
          onPendingEanProcessed={handlePendingEanProcessed}
          onCompleteInventory={handleCompleteInventory}
          initialItem={editingItem}
        />
      </View>
    )
  }

  if (currentView === "complete") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              <Rect width="100" height="100" rx="20" fill="#22c55e" />
              <Path d="M30 50 L45 65 L75 35" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>

          <Text style={styles.completeTitle}>Inventúra úspešne dokončená</Text>

          <View style={styles.completeInfoCard}>
            <View>
              <Text style={styles.infoLabel}>Meno:</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyInputText}>{user?.name}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.infoLabel}>ID inventúry:</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyInputText}>{user?.inv_id}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButtonLarge} onPress={handleLogout}>
            <Text style={styles.logoutButtonLargeText}>Odhlásiť sa</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Dashboard View (Start)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Odhlásiť</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo width={140} height={50} />
          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        </View>

        {/* News Card */}
        <View style={[styles.newsCard, { borderLeftColor: user?.news_color ? `#${user.news_color}` : "#3b82f6" }]}>
          <Text style={styles.newsTitle}>NOVINKY A AKTUALITY</Text>
          <Text style={styles.newsText}>
            {user?.news_message || "Žiadne nové správy."}
          </Text>
        </View>

        {/* Info Fields */}
        <View style={styles.infoCard}>
          <View>
            <Text style={styles.infoLabel}>Meno:</Text>
            <Text style={styles.infoValue}>{user?.name}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>ID inventúry:</Text>
            <Text style={styles.infoValue}>{user?.inv_id}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, isStartingInventory && { opacity: 0.7 }]}
          onPress={handleStartInventory}
          disabled={isStartingInventory}
        >
          {isStartingInventory ? (
            <Text style={styles.startButtonText}>Spúšťam...</Text>
          ) : (
            <Text style={styles.startButtonText}>Začať inventúru</Text>
          )}
        </TouchableOpacity>
      </View>
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
  logoutButton: {
    alignSelf: 'flex-end',
    backgroundColor: "#1e293b", // Dark slate background to match card style (or could be red)
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  logoutText: {
    color: "#ef4444", // Red text to indicate destructive action
    fontWeight: "bold",
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  newsCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  newsTitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  newsText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
  infoCard: {
    gap: 16,
    marginBottom: 40,
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 8,
  },
  infoValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  startButton: {
    backgroundColor: "#22c55e",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  // Other styles kept for safety/completeness if referenced
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 40,
    textAlign: "center",
  },
  successIconContainer: {
    marginBottom: 24,
  },
  completeInfoCard: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  readonlyInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 16,
  },
  readonlyInputText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  logoutButtonLarge: {
    backgroundColor: "#3b82f6",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: '100%',
  },
  logoutButtonLargeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusText: {
    color: "#fbbf24", // Amber color for visibility
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
})
