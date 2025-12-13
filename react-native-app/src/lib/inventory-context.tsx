"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import { useAuth } from "./auth-context"
import { type InventoryItem, type Product, type MissingProduct, api } from "./api"

// Helper for storage (reused logic could be refactored, but keeping self-contained for now or import from auth)
// Since getItem/setItem are not exported from auth-context, I'll duplicate or just use simple localStorage/SecureStore here.
// For simplicity in this context, let's implement the helpers locally.

async function getItem(key: string) {
    if (Platform.OS === "web") {
        return localStorage.getItem(key)
    }
    return SecureStore.getItemAsync(key)
}

async function setItem(key: string, value: string) {
    if (Platform.OS === "web") {
        return localStorage.setItem(key, value)
    }
    return SecureStore.setItemAsync(key, value)
}

async function deleteItem(key: string) {
    if (Platform.OS === "web") {
        return localStorage.removeItem(key)
    }
    return SecureStore.deleteItemAsync(key)
}

interface InventoryContextType {
    items: InventoryItem[]
    addItem: (product: Product, quantity: number) => Promise<void>
    refreshItems: () => Promise<void>
    clearItems: () => Promise<void>
    isLoading: boolean
    missingItems: MissingProduct[]
    missingCount: number
    refreshMissingItems: () => Promise<void>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [items, setItems] = useState<InventoryItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [missingItems, setMissingItems] = useState<MissingProduct[]>([])
    const [missingCount, setMissingCount] = useState(0)

    // Load items whenever the user (specifically inv_id) changes
    useEffect(() => {
        if (user?.inv_id) {
            loadLocalItems(user.inv_id)
            refreshMissingItems()
        } else {
            setItems([])
            setMissingItems([])
            setMissingCount(0)
        }
    }, [user?.inv_id])

    async function loadLocalItems(invId: string) {
        setIsLoading(true)
        try {
            const key = `inventory_items_${invId}`
            const json = await getItem(key)
            if (json) {
                setItems(JSON.parse(json))
            } else {
                setItems([])
            }
        } catch (e) {
            console.error("Failed to load inventory items", e)
        } finally {
            setIsLoading(false)
        }
    }

    async function refreshMissingItems() {
        try {
            const response = await api.getMissingProducts()
            if (response.success && response.data) {
                setMissingItems(response.data.missing_products || [])
                setMissingCount(response.data.total || 0)
            }
        } catch (e) {
            console.error("Failed to refresh missing items", e)
        }
    }

    async function addItem(product: Product, quantity: number) {
        if (!user?.inv_id) return

        const now = new Date().toISOString()

        // Check if item already exists
        const existingIndex = items.findIndex(i => i.ean === product.ean)

        let updatedItems: InventoryItem[]

        if (existingIndex >= 0) {
            // Update existing
            updatedItems = [...items]
            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                quantity: quantity, // Overwrite quantity (user requirement: "aktualizuj")
                scannedAt: now,
                name: product.name // ensure name is up to date too if needed
            }
            // Optional: Move to top? User didn't ask, but "update v zariadeni" usually keeps pos or moves. 
            // Let's keep position to avoid jumping list if they edit from list. 
            // actually, usually recently scanned is at top. 
            // If I edit from list, I might expect it to stay or go top. 
            // Let's just update in place for now.
        } else {
            // Add new
            const newItem: InventoryItem = {
                id: Date.now(),
                name: product.name,
                ean: product.ean,
                quantity: quantity,
                unit: product.unit || "ks",
                scannedAt: now
            }
            updatedItems = [newItem, ...items]
        }

        setItems(updatedItems)

        try {
            const key = `inventory_items_${user.inv_id}`
            await setItem(key, JSON.stringify(updatedItems))
        } catch (e) {
            console.error("Failed to save item", e)
        }
    }

    async function refreshItems() {
        if (user?.inv_id) {
            await loadLocalItems(user.inv_id)
        }
    }

    async function clearItems() {
        // This would clear the persistent storage. 
        // Use carefuly. The user said "when user logs out delete them". 
        // Since our useEffect clears state when user is null, that covers the UI.
        // To strictly delete from disk on logout, we might need a separate trigger, 
        // OR we rely on the fact that the next login with SAME inv_id might actully WANT those items back?
        // User said: "uchovavat tam vsetky naskenovane produkty... ked da uzivatel odhlasit tak az vtedy ich vymazat"
        // So explicit delete is needed on logout. 
        // But wait, the logout function is in AuthProvider.

        // Better approach: When AuthProvider logs out, it doesn't know about this context.
        // We can listen to user being null. If user becomes null, we effectively "lost" access to the key (since we don't have inv_id).
        // BUT we want to DELETE the data.

        // Actually, if we want to delete on logout, we should probably expose a method to do so, 
        // but how does Auth call it?

        // Alternative: Check if we can intercept logout. 
        // Or, simpler: Just clear the CURRENT inventory from storage when `user` changes from SOMETHING to NULL?
        // But useEffect runs after the change.

        // Let's stick to the requirement: "Data ukladat tak aby boli viazane na id inventury" (bind to inv_id).
        // "Ked da uzivatel odhlasit tak az vtedy ich vymazat".
        // This implies the session is temporary. If I force close app and open, should they be there? YES (probably).
        // Only explicit LOGOUT clears them.

        // So, in AuthContext.logout(), we might want to clear specific keys? 
        // Or we inject a "onLogout" callback?

        // Let's implement `clearInventory` and expose it. 
    }

    return (
        <InventoryContext.Provider value={{ items, addItem, refreshItems, clearItems, isLoading, missingItems, missingCount, refreshMissingItems }}>
            {children}
        </InventoryContext.Provider>
    )
}

export function useInventory() {
    const context = useContext(InventoryContext)
    if (context === undefined) {
        throw new Error("useInventory must be used within an InventoryProvider")
    }
    return context
}
