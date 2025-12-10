const API_BASE_URL = "https://barovainventura.sk/api"

export interface Product {
  id: number
  name: string
  ean: string
  quantity_on_stock: number
  unit: string
}

export interface InventoryItem {
  id: number
  name: string
  ean: string
  quantity: number
  unit: string
}

export interface MissingProduct {
  id: number
  name: string
  ean: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.message || "Chyba servera" }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: "Chyba pripojenia k serveru" }
    }
  }

  async login(username: string, password: string) {
    return this.request<{ token: string; user: { name: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
  }

  async getProduct(ean: string) {
    return this.request<Product>(`/product/get?ean=${ean}`)
  }

  async saveProductQuantity(ean: string, quantity: number) {
    return this.request<{ success: boolean }>("/product/save-quantity", {
      method: "POST",
      body: JSON.stringify({ ean, quantity }),
    })
  }

  async getInventoryList() {
    return this.request<{ items: InventoryItem[]; total: number }>("/inventory/list")
  }

  async getMissingProducts() {
    return this.request<{ items: MissingProduct[]; total: number }>("/product/get-missing-products")
  }

  async startInventory() {
    return this.request<{ success: boolean }>("/inventory/start", {
      method: "POST",
    })
  }

  async completeInventory() {
    return this.request<{ success: boolean }>("/inventory/complete", {
      method: "POST",
    })
  }

  async getInventoryStatus() {
    return this.request<{ active: boolean; startedAt?: string }>("/inventory/status")
  }
}

export const api = new ApiClient()
