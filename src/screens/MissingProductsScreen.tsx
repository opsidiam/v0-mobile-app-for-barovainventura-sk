"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../App"
import { api, type MissingProduct } from "../lib/api"
import { Ionicons } from "@expo/vector-icons"

type MissingProductsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MissingProducts">
}

export function MissingProductsScreen({ navigation }: MissingProductsScreenProps) {
  const [products, setProducts] = useState<MissingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetchMissingProducts()

    const interval = setInterval(fetchMissingProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMissingProducts() {
    try {
      const data = await api.getMissingProducts()
      setProducts(data.products)
      setCount(data.count)
    } catch (error) {
      console.error("Failed to fetch missing products:", error)
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

  function renderItem({ item }: { item: MissingProduct }) {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddProduct(item.ean)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    )
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
        {count > 0 ? (
          <View style={styles.headerWithBadge}>
            <Text style={styles.headerText}>Chýbajúce produkty:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f9cff" />}
        />
      )}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4e",
  },
  headerWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    color: "#888",
    fontSize: 14,
  },
  badge: {
    backgroundColor: "#ff6b6b",
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
    backgroundColor: "#2a2a4e",
    borderRadius: 12,
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
    color: "#888",
  },
  addButton: {
    backgroundColor: "#4f9cff",
    width: 44,
    height: 44,
    borderRadius: 22,
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
