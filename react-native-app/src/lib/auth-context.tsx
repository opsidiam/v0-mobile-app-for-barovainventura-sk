"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import { api } from "./api"
import * as ExpoCrypto from "expo-crypto"

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

interface User {
  name: string
  inv_id: string
  news_message: string
  news_color: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStoredAuth()
  }, [])

  async function loadStoredAuth() {
    try {
      const storedToken = await getItem("auth_token")
      const storedUser = await getItem("auth_user")

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        api.setToken(storedToken)
      }
    } catch (error) {
      console.error("Failed to load auth:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(username: string, password: string) {
    try {
      const passwordHash = await ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, password)
      const response = await api.login(username, passwordHash)

      if (response.success && response.data) {
        const { token: newToken, user_name, inv_id, news_message, news_color } = response.data
        const newUser: User = {
          name: user_name,
          inv_id: String(inv_id),
          news_message,
          news_color
        }

        await setItem("auth_token", newToken)
        await setItem("auth_user", JSON.stringify(newUser))

        setToken(newToken)
        setUser(newUser)
        api.setToken(newToken)

        return { success: true }
      }

      return { success: false, error: response.error }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Chyba pri prihlasovaní: " + (error as Error).message }
    }
  }

  async function logout() {
    await deleteItem("auth_token")
    await deleteItem("auth_user")

    setToken(null)
    setUser(null)
    api.setToken(null)
  }

  return <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
