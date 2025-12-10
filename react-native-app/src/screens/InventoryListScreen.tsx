"use client"

import { useState, useEffect } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native"
import { api, type InventoryItem } from "../lib/api"

interface InventoryListScreenProps {
  onBack: () => void
}

export function InventoryListScreen({ onBack }: InventoryListScreenProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const response = await api.getInventoryList()
    if (response.success && response.data) {
      setItems(response.data.items)
    }
    setIsLoading(false)
    setIsRefreshing(false)
  }

  function handleRefresh() {
    setIsRefreshing(true)
    loadItems()
  }

  function renderItem({ item }: { item: InventoryItem }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit}
        </Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Späť</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Prehľad inventúry</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={styles.emptyText}>Žiadne naskenované produkty</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: "#3b82f6",
    fontSize: 16,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  item: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemEan: {
    color: "#64748b",
    fontSize: 12,
  },
  itemQuantity: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 32,
  },
})
