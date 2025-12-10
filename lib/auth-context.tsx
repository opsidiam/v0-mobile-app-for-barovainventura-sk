"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { login as apiLogin, logout as apiLogout, refreshToken, type LoginResponse } from "./api"

interface AuthState {
  token: string | null
  user: {
    userId: string
    userName: string
    invId: string
    multipleProducts: boolean
    newsMessage?: string
    newsColor?: string
  } | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (userId: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = "barova_inventura_token"
const USER_KEY = "barova_inventura_user"
const TOKEN_EXPIRY_KEY = "barova_inventura_token_expiry"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Načítanie tokenu z localStorage pri štarte
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)
    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

    if (storedToken && storedUser && tokenExpiry) {
      const expiryTime = Number.parseInt(tokenExpiry, 10)
      const now = Date.now()

      if (now < expiryTime) {
        setState({
          token: storedToken,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        // Token expiroval
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_EXPIRY_KEY)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Auto-refresh tokenu pred expiráciou
  useEffect(() => {
    if (!state.token) return

    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!tokenExpiry) return

    const expiryTime = Number.parseInt(tokenExpiry, 10)
    const refreshTime = expiryTime - 5 * 60 * 1000 // 5 minút pred expiráciou
    const now = Date.now()

    if (refreshTime > now) {
      const timeout = setTimeout(async () => {
        try {
          const newToken = await refreshToken(state.token!)
          const newExpiry = Date.now() + 3600 * 1000 // 1 hodina

          localStorage.setItem(TOKEN_KEY, newToken)
          localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString())

          setState((prev) => ({ ...prev, token: newToken }))
        } catch {
          // Refresh zlyhal, odhlásenie
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          localStorage.removeItem(TOKEN_EXPIRY_KEY)
          setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      }, refreshTime - now)

      return () => clearTimeout(timeout)
    }
  }, [state.token])

  const login = useCallback(async (userId: string, password: string) => {
    const response: LoginResponse = await apiLogin(userId, password)

    const user = {
      userId,
      userName: response.user_name,
      invId: response.inv_id,
      multipleProducts: response.multiple_products,
      newsMessage: response.news_message,
      newsColor: response.news_color,
    }

    const expiry = Date.now() + response.token_expire * 1000

    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString())

    setState({
      token: response.token,
      user,
      isAuthenticated: true,
      isLoading: false,
    })
  }, [])

  const logout = useCallback(async () => {
    if (state.token) {
      try {
        await apiLogout(state.token)
      } catch {
        // Ignorujeme chybu pri odhlásení
      }
    }

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)

    setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }, [state.token])

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth musí byť použitý v AuthProvider")
  }
  return context
}
