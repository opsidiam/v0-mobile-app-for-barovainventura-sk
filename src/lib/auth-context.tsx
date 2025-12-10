"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    try {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const savedUser = await SecureStore.getItemAsync(USER_KEY)
      if (savedToken && savedUser) {
        api.setToken(savedToken)
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
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

    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
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
