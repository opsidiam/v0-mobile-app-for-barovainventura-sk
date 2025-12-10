"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native"
import { api, type InventoryItem } from "../lib/api"
import { Ionicons } from "@expo/vector-icons"

export function InventoryListScreen() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchInventory()
  }, [])

  async function fetchInventory() {
    try {
      const data = await api.getInventoryList()
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchInventory()
  }, [])

  function renderItem({ item }: { item: InventoryItem }) {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.product_name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <View style={styles.itemQuantity}>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
        </View>
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
        <Text style={styles.headerText}>Celkom produktov: {total}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Žiadne naskenované produkty</Text>
        </View>
      ) : (
        <FlatList
          data={items}
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
  headerText: {
    color: "#888",
    fontSize: 14,
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
  itemQuantity: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4f9cff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    marginTop: 16,
  },
})
