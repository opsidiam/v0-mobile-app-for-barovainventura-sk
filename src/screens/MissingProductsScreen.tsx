"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../App"
import { api, type Product } from "../lib/api"
import { Ionicons } from "@expo/vector-icons"

type MissingProductsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MissingProducts">
}

export function MissingProductsScreen({ navigation }: MissingProductsScreenProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchMissingProducts()

    const interval = setInterval(fetchMissingProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMissingProducts() {
    try {
      console.log("[v0] Fetching missing products list...")
      const data = await api.getMissingProducts()
      console.log("[v0] Missing products data:", JSON.stringify(data))
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to fetch missing products:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMissingProducts()
  }, [])

  function handleAddProduct(ean: string) {
    navigation.navigate("Scanner", { pendingEan: ean })
  }

  function renderItem({ item }: { item: Product }) {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemIcon}>
          <Text style={styles.itemIconText}>📦</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddProduct(item.ean || "")}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backText}>Nazad</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Nenaskenované produkty</Text>
        {products.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{products.length}</Text>
          </View>
        )}
      </View>
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="rgba(74,222,128,0.6)" />
          <Text style={styles.emptyText}>Všetky produkty boli naskenované!</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => item.ean || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#2e2e38",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconText: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  itemEan: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#2e2e38",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
})
