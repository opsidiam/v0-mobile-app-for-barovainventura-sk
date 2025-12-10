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
  const { logout, userName } = useAuth()
  const [missingCount, setMissingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMissingCount()
    setLoading(false)

    const interval = setInterval(fetchMissingCount, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMissingCount() {
    try {
      const data = await api.getMissingProducts()
      setMissingCount(Array.isArray(data) ? data.length : 0)
    } catch (error) {
      console.error("Failed to fetch missing count:", error)
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
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Vitajte,</Text>
          <Text style={styles.userName}>{userName || "Používateľ"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {/* Scanner button */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Scanner", {})}>
          <View style={styles.menuIcon}>
            <Ionicons name="barcode-outline" size={28} color="#fff" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Skenovanie produktov</Text>
            <Text style={styles.menuSubtitle}>Skenovať EAN kódy produktov</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Inventory list */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("InventoryList")}>
          <View style={styles.menuIcon}>
            <Ionicons name="list-outline" size={28} color="#fff" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Prehľad inventúry</Text>
            <Text style={styles.menuSubtitle}>Zobraziť naskenované produkty</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Missing products */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("MissingProducts")}>
          <View style={styles.menuIcon}>
            <Ionicons name="alert-circle-outline" size={28} color="#fff" />
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
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2e2e38",
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
    color: "rgba(255,255,255,0.5)",
  },
  badge: {
    backgroundColor: "#ef4444",
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
