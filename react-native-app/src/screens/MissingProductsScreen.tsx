import { useState, useEffect, useRef } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native"
import { api, type MissingProduct } from "../lib/api"
import { useInventory } from "../lib/inventory-context"
import Svg, { Path, Rect, Circle, G } from "react-native-svg"

interface MissingProductsScreenProps {
  user?: any
  onBack: () => void
  onScanProduct: (ean: string) => void
}

export function MissingProductsScreen({ user, onBack, onScanProduct }: MissingProductsScreenProps) {
  const { missingItems = [], refreshMissingItems, isLoading: isContextLoading } = useInventory()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use items from context. 
  // No local useEffect for interval/loading needed as context handles it.

  function handleRefresh() {
    setIsRefreshing(true)
    refreshMissingItems().finally(() => setIsRefreshing(false))
  }

  function renderItem({ item }: { item: MissingProduct }) {
    return (
      <View style={styles.itemCard}>

        {/* Header: Icon + Name */}
        <View style={styles.cardHeader}>
          {/* Bottle Icon Placeholder */}
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ marginRight: 12 }}>
            <Path d="M9 3h6v4h-6z M10 7v6l-4 4v4h16v-4l-4-4v-6" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        </View>

        {/* EAN Row */}
        <View style={styles.infoRow}>
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <Path d="M3 4h2v16h-2z M8 4h1v16h-1z M12 4h2v16h-2z M17 4h1v16h-1z M21 4h2v16h-2z" />
          </Svg>
          <Text style={styles.infoText}>{item.ean}</Text>
        </View>

        <TouchableOpacity style={styles.scanActionButton} onPress={() => onScanProduct(item.ean)}>
          <Text style={styles.scanActionText}>Naskenovať</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Removed local isLoading check

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.whiteBackButton}>
            <Text style={styles.whiteBackButtonText}>← Nazad</Text>
          </TouchableOpacity>

          <View style={styles.headerInfoRight}>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerLabel}>Meno</Text>
              <Text style={styles.headerValue}>{user?.name || "---"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerLabel}>ID inventúry</Text>
              <Text style={styles.headerValue}>{user?.inv_id || "---"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Title Row below header */}
      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Nenaskenované produkty</Text>
        {missingItems.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{missingItems.length}</Text>
          </View>
        )}
      </View>


      <FlatList
        data={missingItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.ean}
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
    paddingTop: 60,
    backgroundColor: "#000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  whiteBackButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  whiteBackButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  headerInfoRight: {
    flexDirection: "row",
    gap: 16,
  },
  headerInfoItem: {
    alignItems: "flex-end",
  },
  headerLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  headerValue: {
    color: "#fff",
    fontSize: 12,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  subTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#0f172a", // Dark Slate card
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  scanActionButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  scanActionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
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
