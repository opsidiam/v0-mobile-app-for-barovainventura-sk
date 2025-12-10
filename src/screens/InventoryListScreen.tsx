"use client"

import { useState, useCallback } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface ScannedItem {
  id: string
  name: string
  ean: string
  quantity: number
  unit: string
}

export function InventoryListScreen() {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // Items are stored locally for now
    setRefreshing(false)
  }, [])

  function renderItem({ item }: { item: ScannedItem }) {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
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
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Celkom produktov: {items.length}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="rgba(255,255,255,0.4)" />
          <Text style={styles.emptyText}>Žiadne naskenované produkty</Text>
          <Text style={styles.emptySubtext}>Naskenujte produkty pomocou kamery</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        />
      )}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
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
  itemQuantity: {
    backgroundColor: "#2e2e38",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    marginTop: 8,
  },
})
