"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native"
import { api, type MissingProduct } from "../lib/api"

interface MissingProductsScreenProps {
  onBack: () => void
  onScanProduct: (ean: string) => void
}

export function MissingProductsScreen({ onBack, onScanProduct }: MissingProductsScreenProps) {
  const [items, setItems] = useState<MissingProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadItems()

    // Auto-refresh every 5 seconds
    intervalRef.current = setInterval(loadItems, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  async function loadItems() {
    const response = await api.getMissingProducts()
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

  function renderItem({ item }: { item: MissingProduct }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemEan}>{item.ean}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => onScanProduct(item.ean)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Nenaskenované produkty</Text>
        {items.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Všetky produkty boli naskenované!</Text>
          </View>
        }
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
    flex: 1,
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 14,
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
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: "#3b82f6",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 32,
  },
  emptyText: {
    color: "#22c55e",
    fontSize: 16,
    textAlign: "center",
  },
})
