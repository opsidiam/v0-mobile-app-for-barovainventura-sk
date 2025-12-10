"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import * as SecureStore from "expo-secure-store"
import { api } from "./api"

interface User {
  name: string
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
      const storedToken = await SecureStore.getItemAsync("auth_token")
      const storedUser = await SecureStore.getItemAsync("auth_user")

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
    const response = await api.login(username, password)

    if (response.success && response.data) {
      const { token: newToken, user: newUser } = response.data

      await SecureStore.setItemAsync("auth_token", newToken)
      await SecureStore.setItemAsync("auth_user", JSON.stringify(newUser))

      setToken(newToken)
      setUser(newUser)
      api.setToken(newToken)

      return { success: true }
    }

    return { success: false, error: response.error }
  }

  async function logout() {
    await SecureStore.deleteItemAsync("auth_token")
    await SecureStore.deleteItemAsync("auth_user")

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
