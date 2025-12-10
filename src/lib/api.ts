const API_BASE_URL = "https://barovainventura.sk"

export interface Product {
  id: number
  name: string
  ean: string
  quantity_on_stock: number
  unit: string
}

export interface InventoryItem {
  id: number
  product_name: string
  ean: string
  quantity: number
  unit: string
  created_at: string
}

export interface MissingProduct {
  id: number
  name: string
  ean: string
}

export interface MissingProductsResponse {
  count: number
  products: MissingProduct[]
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }))
      throw new Error(error.message || "Request failed")
    }

    return response.json()
  }

  async login(username: string, password: string): Promise<{ token: string }> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
  }

  async getProduct(ean: string): Promise<Product> {
    return this.request(`/api/product/get-product?ean=${ean}`)
  }

  async saveInventoryItem(ean: string, quantity: number): Promise<{ success: boolean }> {
    return this.request("/api/product/save-inventory", {
      method: "POST",
      body: JSON.stringify({ ean, quantity }),
    })
  }

  async getInventoryList(): Promise<{ items: InventoryItem[]; total: number }> {
    return this.request("/api/product/get-inventory-list")
  }

  async getMissingProducts(): Promise<MissingProductsResponse> {
    return this.request("/api/product/get-missing-products")
  }

  async startInventory(): Promise<{ success: boolean }> {
    return this.request("/api/inventory/start", { method: "POST" })
  }

  async completeInventory(): Promise<{ success: boolean }> {
    return this.request("/api/inventory/complete", { method: "POST" })
  }

  async getInventoryStatus(): Promise<{ active: boolean; startedAt?: string }> {
    return this.request("/api/inventory/status")
  }
}

export const api = new ApiClient()
