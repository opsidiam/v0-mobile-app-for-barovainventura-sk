"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import { api } from "./api"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  userName: string | null
  login: (userId: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "auth_token"
const USER_NAME_KEY = "user_name"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    try {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const savedUserName = await SecureStore.getItemAsync(USER_NAME_KEY)
      if (savedToken) {
        api.setToken(savedToken)
        setToken(savedToken)
        setUserName(savedUserName)
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
    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
    await SecureStore.setItemAsync(USER_NAME_KEY, response.user_name || "")
    api.setToken(response.token)
    setToken(response.token)
    setUserName(response.user_name || null)
    setIsAuthenticated(true)
  }

  async function logout() {
    try {
      await api.logout()
    } catch (error) {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_NAME_KEY)
    api.setToken(null)
    setToken(null)
    setUserName(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, userName, login, logout }}>
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
