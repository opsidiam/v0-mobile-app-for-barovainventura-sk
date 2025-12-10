"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../App"
import { useAuth } from "../lib/auth-context"
import { api } from "../lib/api"
import { Ionicons } from "@expo/vector-icons"

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { logout } = useAuth()
  const [inventoryActive, setInventoryActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [missingCount, setMissingCount] = useState(0)

  useEffect(() => {
    checkInventoryStatus()
    fetchMissingCount()

    const interval = setInterval(fetchMissingCount, 5000)
    return () => clearInterval(interval)
  }, [])

  async function checkInventoryStatus() {
    try {
      const status = await api.getInventoryStatus()
      setInventoryActive(status.active)
    } catch (error) {
      console.error("Failed to check inventory status:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMissingCount() {
    try {
      const data = await api.getMissingProducts()
      setMissingCount(data.count)
    } catch (error) {
      console.error("Failed to fetch missing count:", error)
    }
  }

  async function handleStartInventory() {
    try {
      await api.startInventory()
      setInventoryActive(true)
      navigation.navigate("Scanner", {})
    } catch (error) {
      Alert.alert("Chyba", "Nepodarilo sa začať inventúru")
    }
  }

  async function handleLogout() {
    Alert.alert("Odhlásiť sa", "Naozaj sa chcete odhlásiť?", [
      { text: "Zrušiť", style: "cancel" },
      { text: "Odhlásiť", onPress: logout, style: "destructive" },
    ])
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f9cff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vitajte v inventúre</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {inventoryActive ? (
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Scanner", {})}>
            <View style={styles.menuIcon}>
              <Ionicons name="barcode-outline" size={32} color="#4f9cff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Pokračovať v skenovaní</Text>
              <Text style={styles.menuSubtitle}>Skenovať EAN kódy produktov</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.menuItem} onPress={handleStartInventory}>
            <View style={styles.menuIcon}>
              <Ionicons name="play-circle-outline" size={32} color="#4ade80" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Začať inventúru</Text>
              <Text style={styles.menuSubtitle}>Spustiť novú inventúru</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("InventoryList")}>
          <View style={styles.menuIcon}>
            <Ionicons name="list-outline" size={32} color="#4f9cff" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Prehľad inventúry</Text>
            <Text style={styles.menuSubtitle}>Zobraziť naskenované produkty</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("MissingProducts")}>
          <View style={styles.menuIcon}>
            <Ionicons name="alert-circle-outline" size={32} color="#ff6b6b" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Nenaskenované produkty</Text>
            <Text style={styles.menuSubtitle}>Produkty čakajúce na skenovanie</Text>
          </View>
          {missingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{missingCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  logoutButton: {
    padding: 8,
  },
  menuContainer: {
    padding: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4e",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#888",
  },
  badge: {
    backgroundColor: "#ff6b6b",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
})
