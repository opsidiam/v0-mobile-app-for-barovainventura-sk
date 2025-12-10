"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import { AppState, type AppStateStatus } from "react-native"
import { api } from "./api"

interface User {
  userId: string
  userName: string
  invId: string
  multipleProducts: boolean
  newsMessage?: string
  newsColor?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  user: User | null
  login: (userId: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "auth_token"
const USER_KEY = "user_data"
const TOKEN_EXPIRY_KEY = "token_expiry"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    loadToken()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(
      async () => {
        await refreshToken()
      },
      5 * 60 * 1000,
    ) // 5 minutes

    const subscription = AppState.addEventListener("change", handleAppStateChange)

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [isAuthenticated])

  async function handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === "active" && isAuthenticated) {
      const isExpired = await checkTokenExpiration()
      if (isExpired) {
        await logout()
      } else {
        await refreshToken()
      }
    }
  }

  async function checkTokenExpiration(): Promise<boolean> {
    try {
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY)
      if (!expiryStr) return true

      const expiry = Number.parseInt(expiryStr, 10)
      const now = Date.now()
      return now > expiry
    } catch (error) {
      return true
    }
  }

  async function refreshToken() {
    try {
      const newToken = await api.refreshToken()
      await saveToken(newToken)
      api.setToken(newToken)
      setToken(newToken)
    } catch (error) {
      console.error("Failed to refresh token:", error)
      await logout()
    }
  }

  async function saveToken(token: string) {
    const expiry = Date.now() + 5 * 60 * 1000 // 5 minutes
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString())
  }

  async function loadToken() {
    try {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const savedUser = await SecureStore.getItemAsync(USER_KEY)

      if (savedToken && savedUser) {
        const isExpired = await checkTokenExpiration()
        if (isExpired) {
          await SecureStore.deleteItemAsync(TOKEN_KEY)
          await SecureStore.deleteItemAsync(USER_KEY)
          await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY)
        } else {
          api.setToken(savedToken)
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
        }
      }
    } catch (error) {
      console.error("Failed to load token:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(userId: string, password: string) {
    const response = await api.login(userId, password)

    const userData: User = {
      userId: userId,
      userName: response.user_name || "",
      invId: response.inv_id || "",
      multipleProducts: response.multiple_products || false,
      newsMessage: response.news_message,
      newsColor: response.news_color,
    }

    await saveToken(response.token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData))
    api.setToken(response.token)
    setToken(response.token)
    setUser(userData)
    setIsAuthenticated(true)
  }

  async function logout() {
    try {
      await api.logout()
    } catch (error) {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY)
    api.setToken(null)
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
