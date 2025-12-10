"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import { api } from "./api"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "auth_token"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (token) {
        api.setToken(token)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Failed to load token:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(username: string, password: string) {
    const response = await api.login(username, password)
    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
    api.setToken(response.token)
    setIsAuthenticated(true)
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    api.setToken(null)
    setIsAuthenticated(false)
  }

  return <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
