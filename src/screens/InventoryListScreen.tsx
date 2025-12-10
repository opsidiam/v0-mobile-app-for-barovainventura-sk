"use client"

import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import type { RootStackParamList, ScannedProduct } from "../../App"

type InventoryListScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "InventoryList">
  route: RouteProp<RootStackParamList, "InventoryList">
}

export function InventoryListScreen({ navigation, route }: InventoryListScreenProps) {
  const products = route.params?.products || []

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })
  }

  function renderItem({ item }: { item: ScannedProduct }) {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemIcon}>
          <Text style={styles.itemIconText}>🍾</Text>
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleContainer}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.alcoholContent && item.alcoholContent !== "0" && (
                <Text style={styles.itemAlcohol}>{item.alcoholContent}%</Text>
              )}
            </View>
            <Text style={styles.itemTime}>{formatTime(item.scannedAt)}</Text>
          </View>
          <Text style={styles.itemEan}>{item.ean}</Text>
          <View style={styles.itemMeta}>
            {item.volume && <Text style={styles.itemVolume}>{item.volume}</Text>}
            <Text style={styles.itemQuantity}>{item.quantity}ks</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backText}>Nazad</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Prehľad inventúry</Text>
        <Text style={styles.subtitle}>{products.length} produktov</Text>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="rgba(255,255,255,0.4)" />
          <Text style={styles.emptyText}>Zatiaľ neboli naskenované žiadne produkty</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.ean + item.scannedAt}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  subtitle: {
    color: "rgba(255,255,255,0.5)",
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
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  itemAlcohol: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  itemTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  itemEan: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  itemVolume: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
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
