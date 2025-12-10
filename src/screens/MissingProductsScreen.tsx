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
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddProduct(item.ean || "")}>
          <Ionicons name="add" size={24} color="#fff" />
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
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nenaskenované produkty</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.header}>
        {products.length > 0 ? (
          <View style={styles.headerWithBadge}>
            <Text style={styles.headerText}>Chýbajúce produkty:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{products.length}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.headerText}>Všetky produkty naskenované</Text>
        )}
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#4ade80" />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
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
    padding: 16,
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  itemEan: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  addButton: {
    backgroundColor: "#2e2e38",
    width: 44,
    height: 44,
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
    color: "#4ade80",
    fontSize: 16,
    marginTop: 16,
  },
})
