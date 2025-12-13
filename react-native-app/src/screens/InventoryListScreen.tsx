import { useState, useEffect } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native"
import { api, type InventoryItem } from "../lib/api"
import { useInventory } from "../lib/inventory-context"
import Svg, { Path, Rect, Circle, G } from "react-native-svg"

interface InventoryListScreenProps {
  user?: any
  onBack: () => void
  onCompleteInventory: () => void
  onEdit: (item: InventoryItem) => void
}

export function InventoryListScreen({ user, onBack, onCompleteInventory, onEdit }: InventoryListScreenProps) {
  const { items, refreshItems } = useInventory()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Items are now managed by context, no need for local state fetching (except refresh trigger)

  function handleRefresh() {
    setIsRefreshing(true)
    refreshItems().finally(() => setIsRefreshing(false))
  }

  function renderItem({ item }: { item: InventoryItem }) {
    // Format time
    let timeString = "--:--"
    if (item.scannedAt) {
      const date = new Date(item.scannedAt)
      timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => onEdit(item)}>

        {/* Header: Icon + Name + Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {/* Bottle Icon Placeholder */}
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <Path d="M9 3h6v4h-6z M10 7v6l-4 4v4h16v-4l-4-4v-6" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>

        {/* EAN Row */}
        <View style={styles.infoRow}>
          {/* Barcode Icon */}
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <Path d="M3 4h2v16h-2z M8 4h1v16h-1z M12 4h2v16h-2z M17 4h1v16h-1z M21 4h2v16h-2z" />
          </Svg>
          <Text style={styles.infoText}>{item.ean}</Text>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>

          {/* Volume/Quantity Row */}
          <View style={styles.detailItem}>
            {/* Weight/Scale Icon */}
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <Path d="M4 7h16M4 7l2 12h12l2-12M9 7v12M15 7v12" />
            </Svg>
            <Text style={styles.detailText}>{item.quantity} {item.unit}</Text>
          </View>

          {/* Time */}
          <View style={styles.detailItemRight}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <Circle cx="12" cy="12" r="10" />
              <Path d="M12 6v6l4 2" />
            </Svg>
            <Text style={styles.detailText}>{timeString}</Text>
          </View>
        </View>
      </TouchableOpacity>
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

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={styles.emptyText}>Žiadne naskenované produkty</Text>}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.completeButton} onPress={onCompleteInventory}>
          <Text style={styles.completeButtonText}>Dokončiť inventúru</Text>
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
  list: {
    padding: 16,
    paddingBottom: 100, // Space for footer
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
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  alcoholBadge: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 4,
    alignItems: "center",
  },
  alcoholText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  alcoholLabel: {
    color: "#000",
    fontSize: 8,
    fontWeight: "bold",
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
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 32,
  },
  footer: {
    padding: 16,
    paddingBottom: 48, // Increased for better access on newer phones
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  completeButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})
